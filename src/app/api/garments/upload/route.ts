import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/server";
import {
  USER_PHOTOS_BUCKET,
  garmentPhotoPath,
  garmentThumbPath,
} from "@/lib/photos";
import { makeThumbnail } from "@/lib/images";
import { gate } from "@/lib/moderation/gate";
import { logModeration } from "@/lib/moderation/log";
import { getPlan } from "@/lib/plan";
import { parseCapError } from "@/lib/limits";
import { paymentsOpen } from "@/lib/payments";
import { touchLastActive } from "@/lib/biometric";

// Garment upload — moderated before storage, exactly like the base photo. Bytes
// checked in memory; only a passing image is written and its row recorded. A
// rejected image is never persisted. Identity from the session, keys server-side.
//
// Idempotent: the client sends its own id (clientId) with the upload. If the app
// is killed in the seconds between the server accepting the photo and the app
// hearing back, it retries on relaunch with the SAME id — and a repeat of an id
// already stored is a no-op success, never a second piece. Older clients that
// send no id fall back to a server-generated one (no idempotency, as before).
export const runtime = "nodejs";
export const maxDuration = 60;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const { supabase, user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await touchLastActive(supabase, user.id);

  // Read the multipart body once; the client id travels with it.
  const form = await request.formData().catch(() => null);
  const rawId = form?.get("clientId") ?? form?.get("garmentId");
  const clientId =
    typeof rawId === "string" && UUID_RE.test(rawId) ? rawId.toLowerCase() : null;

  // Idempotency — before the cap check or any moderation/vision cost: a repeat of
  // an id already stored for this user returns success and does nothing else, so
  // a relaunch retry can never create a duplicate or get blocked by the cap.
  if (clientId) {
    const { data: existing } = await supabase
      .from("garments")
      .select("id")
      .eq("id", clientId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, id: clientId, duplicate: true });
    }
  }

  // Piece cap — enforced here, not just in the UI. Free = 15. Checked before the
  // moderation call so we don't spend a vision call on a piece we won't keep.
  // Piece cap — skipped for a test-exempt account (PAID_OVERRIDE_UIDS). Everyone
  // else is enforced exactly as before.
  const plan = await getPlan(user.id);
  if (!plan.exempt) {
    const { count } = await supabase
      .from("garments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= plan.pieceLimit) {
      return NextResponse.json({
        ok: false,
        full: true,
        reason: plan.paid
          ? `You're at the ${plan.pieceLimit}-piece cap.`
          : paymentsOpen()
            ? "Fifteen is the free limit. Upgrade for more."
            : "Fifteen is the free limit for now.",
      });
    }
  }

  const result = await gate(form?.get("file"), "garment");

  if (result.status === "retry") {
    return NextResponse.json({ ok: false, reason: result.reason });
  }
  if (result.status === "reject") {
    await logModeration({
      userId: user.id,
      kind: "garment",
      decision: "reject",
      reason: result.reason,
    });
    return NextResponse.json({ ok: false, reason: result.reason });
  }

  // Passed — store the image, then record the row. Undo the object if the row
  // insert fails, so storage never drifts from the table. Use the client's id
  // when it sent one, so a retry writes to the same path and the same row.
  const garmentId = clientId ?? crypto.randomUUID();
  const path = garmentPhotoPath(user.id, garmentId);

  const { error: upErr } = await supabase.storage
    .from(USER_PHOTOS_BUCKET)
    .upload(path, result.bytes, {
      // A retry re-sends the same photo to the same path; allow the overwrite so
      // a partial prior attempt can't block it. A fresh server id can't collide.
      upsert: clientId !== null,
      contentType: result.mediaType,
      cacheControl: "3600",
    });
  if (upErr) {
    return NextResponse.json({
      ok: false,
      reason: "Didn't save. Check your connection.",
    });
  }

  // Grid thumbnail — best-effort. If it can't be made or stored, the garment is
  // fine; the grid falls back to the full-size original for a null thumb_path.
  let thumbPath: string | null = null;
  const thumbBytes = await makeThumbnail(result.bytes);
  if (thumbBytes) {
    const tp = garmentThumbPath(user.id, garmentId);
    const { error: thumbErr } = await supabase.storage
      .from(USER_PHOTOS_BUCKET)
      .upload(tp, thumbBytes, {
        upsert: clientId !== null,
        contentType: "image/jpeg",
        cacheControl: "3600",
      });
    if (!thumbErr) thumbPath = tp;
    else console.error("[garments] thumbnail upload failed", thumbErr.message);
  }

  const { error: insErr } = await supabase.from("garments").insert({
    id: garmentId,
    user_id: user.id,
    photo_path: path,
    thumb_path: thumbPath,
    status: "pending",
  });
  if (insErr) {
    // Idempotency race backstop: two concurrent retries with the same client id
    // can both pass the up-front existence check and race to insert; the loser
    // hits the primary-key unique violation (23505). If that id is in fact this
    // user's own row, it's the duplicate we meant to absorb — succeed, and keep
    // the (identical, upserted) image. Otherwise fall through to the error paths.
    if (insErr.code === "23505" && clientId) {
      const { data: owned } = await supabase
        .from("garments")
        .select("id")
        .eq("id", clientId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (owned) {
        return NextResponse.json({ ok: true, id: clientId, duplicate: true });
      }
    }

    const toRemove = thumbPath ? [path, thumbPath] : [path];
    await supabase.storage.from(USER_PHOTOS_BUCKET).remove(toRemove);
    // The database piece-cap trigger (migration 0026) is the authoritative gate —
    // it also catches the concurrency edge the pre-count check above can miss.
    // Translate its refusal into the same friendly "full" message, never a raw
    // database error.
    const cap = parseCapError(insErr);
    if (cap) {
      return NextResponse.json({
        ok: false,
        full: true,
        reason: plan.paid
          ? `You're at the ${cap.cap}-piece cap.`
          : paymentsOpen()
            ? `${cap.cap} is the free limit. Upgrade for more.`
            : `${cap.cap} is the free limit for now.`,
      });
    }
    return NextResponse.json({
      ok: false,
      reason: "Didn't save. Check your connection.",
    });
  }

  await logModeration({ userId: user.id, kind: "garment", decision: "pass" });
  return NextResponse.json({ ok: true, id: garmentId });
}
