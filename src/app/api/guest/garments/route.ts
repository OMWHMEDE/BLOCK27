import { NextResponse } from "next/server";
import { gate } from "@/lib/moderation/gate";
import { analyzeGarmentImage } from "@/lib/brain/analyzeGarment";
import { ensureGuestId, readGuestId } from "@/lib/guest/cookie";
import {
  GUEST_PIECE_LIMIT,
  countGuestGarments,
  guestGarmentPath,
  insertGuestGarment,
  ipFrom,
  ipUploadsExceeded,
  listGuestGarments,
  putGuestObject,
  removeGuestObject,
  signGuestThumbs,
  getGeneration,
} from "@/lib/guest/store";

// Guest garment upload — no account. Same discipline as the real route: the
// image is moderated and analyzed IN MEMORY, and only a passing, usable piece
// is written. A rejected image is never stored. There is no render here — the
// hand is paid-only. Guests are capped at 3 pieces; a rough per-IP limit stops
// one address from spinning up many sessions.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const ip = ipFrom(request);
  const guestId = await ensureGuestId();

  // Per-guest cap first — cheap, and it avoids a vision call we'd discard.
  if ((await countGuestGarments(guestId)) >= GUEST_PIECE_LIMIT) {
    return NextResponse.json({
      ok: false,
      full: true,
      reason: "Three is the preview. Sign up to build a real wardrobe.",
    });
  }
  if (await ipUploadsExceeded(ip)) {
    return NextResponse.json({
      ok: false,
      reason: "Too many uploads from here. Slow down.",
    });
  }

  const form = await request.formData().catch(() => null);
  const result = await gate(form?.get("file"), "garment");
  // A rejected or unreadable image is never persisted. Guests have no account to
  // audit against, so the decision isn't written to moderation_log — but the
  // rule that a rejected image is never stored still holds absolutely.
  if (result.status !== "ok") {
    return NextResponse.json({ ok: false, reason: result.reason });
  }

  // Analyze once, in memory, before anything is written.
  let analysis;
  try {
    analysis = await analyzeGarmentImage(
      result.bytes.toString("base64"),
      result.mediaType,
    );
  } catch {
    return NextResponse.json({
      ok: false,
      reason: "Couldn't read that one. Try another.",
    });
  }
  if (!analysis.usable) {
    return NextResponse.json({
      ok: false,
      reason: analysis.reject_reason || "That photo won't work. Try another.",
    });
  }

  const id = crypto.randomUUID();
  const path = guestGarmentPath(guestId, id, result.mediaType);
  const stored = await putGuestObject(path, result.bytes, result.mediaType);
  if (!stored) {
    return NextResponse.json({
      ok: false,
      reason: "Didn't save. Check your connection.",
    });
  }
  const inserted = await insertGuestGarment({
    guestId,
    ip,
    path,
    mediaType: result.mediaType,
    analysis,
  });
  if (!inserted) {
    // The row didn't persist — undo the object so nothing is orphaned, and tell
    // the truth instead of reporting a success the listing will contradict.
    await removeGuestObject(path);
    return NextResponse.json({
      ok: false,
      reason: "Didn't save. Try again.",
    });
  }

  return NextResponse.json({ ok: true });
}

// The guest's current state — pieces (with signed thumbnails) and, once they've
// used their single generation, the composed outfits. Drives the guest wardrobe
// and outfits screens on load and after each action.
export async function GET() {
  const guestId = await readGuestId();
  if (!guestId) {
    return NextResponse.json({
      items: [],
      limit: GUEST_PIECE_LIMIT,
      generated: false,
      outfits: [],
    });
  }

  const rows = await listGuestGarments(guestId);
  const signed = await signGuestThumbs(rows.map((r) => r.photo_path));
  const items = rows.map((r) => ({
    id: r.id,
    url: signed.get(r.photo_path) ?? null,
    descriptor: r.descriptor ?? r.analysis?.descriptor ?? "",
  }));

  const generation = await getGeneration(guestId);

  return NextResponse.json({
    items,
    limit: GUEST_PIECE_LIMIT,
    generated: !!generation,
    outfits: generation?.outfits ?? [],
  });
}
