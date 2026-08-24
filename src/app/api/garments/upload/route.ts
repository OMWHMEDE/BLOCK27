import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { USER_PHOTOS_BUCKET, garmentPhotoPath } from "@/lib/photos";
import { gate } from "@/lib/moderation/gate";
import { logModeration } from "@/lib/moderation/log";
import { getPlan } from "@/lib/plan";
import { paymentsOpen } from "@/lib/payments";

// Garment upload — moderated before storage, exactly like the base photo. Bytes
// checked in memory; only a passing image is written and its row recorded. A
// rejected image is never persisted. Identity from the session, keys server-side.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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

  const form = await request.formData().catch(() => null);
  const result = await gate(form?.get("file"));

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
  // insert fails, so storage never drifts from the table.
  const garmentId = crypto.randomUUID();
  const path = garmentPhotoPath(user.id, garmentId);

  const { error: upErr } = await supabase.storage
    .from(USER_PHOTOS_BUCKET)
    .upload(path, result.bytes, {
      upsert: false,
      contentType: result.mediaType,
      cacheControl: "3600",
    });
  if (upErr) {
    return NextResponse.json({
      ok: false,
      reason: "Didn't save. Check your connection.",
    });
  }

  const { error: insErr } = await supabase.from("garments").insert({
    id: garmentId,
    user_id: user.id,
    photo_path: path,
    status: "pending",
  });
  if (insErr) {
    await supabase.storage.from(USER_PHOTOS_BUCKET).remove([path]);
    return NextResponse.json({
      ok: false,
      reason: "Didn't save. Check your connection.",
    });
  }

  await logModeration({ userId: user.id, kind: "garment", decision: "pass" });
  return NextResponse.json({ ok: true });
}
