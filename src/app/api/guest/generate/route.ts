import { NextResponse } from "next/server";
import { composeOutfits } from "@/lib/brain/composeOutfits";
import { readGuestId } from "@/lib/guest/cookie";
import {
  getGeneration,
  ipFrom,
  ipGenerationsExceeded,
  listGuestGarments,
  saveGeneration,
  type GuestOutfit,
} from "@/lib/guest/store";

// The one guest generation. The brain composes a TEXT outfit from the guest's
// pieces — no render, no base photo, the hand never runs. It is single-shot:
// once a generation row exists for this guest, we return the saved outfits
// instead of composing again. Signing up unlocks nothing here — it unlocks the
// hand.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const guestId = await readGuestId();
  if (!guestId) {
    return NextResponse.json({
      ok: false,
      reason: "Add a few pieces first.",
    });
  }

  // Already generated — return the saved result, don't spend another call.
  const existing = await getGeneration(guestId);
  if (existing) {
    return NextResponse.json({
      ok: true,
      already: true,
      outfits: existing.outfits,
    });
  }

  const ip = ipFrom(request);
  if (await ipGenerationsExceeded(ip)) {
    return NextResponse.json({
      ok: false,
      reason: "Too many tries from here. Slow down.",
    });
  }

  const rows = await listGuestGarments(guestId);
  const garments = rows
    .filter((r) => r.analysis)
    .map((r) => ({ id: r.id, analysis: r.analysis }));
  if (garments.length < 2) {
    return NextResponse.json({
      ok: false,
      reason: "One piece isn't an outfit. Add a couple more.",
    });
  }

  const body = (await request.json().catch(() => ({}))) as { occasion?: unknown };
  const occasion =
    typeof body.occasion === "string" ? body.occasion.trim().slice(0, 200) : "";

  let plan;
  try {
    plan = await composeOutfits(garments, occasion);
  } catch {
    return NextResponse.json({
      ok: false,
      reason: "Couldn't compose that. Try again.",
    });
  }

  const validIds = new Set(garments.map((g) => g.id));
  const outfits: GuestOutfit[] = plan.outfits
    .filter(
      (o) => o.item_ids.length >= 2 && o.item_ids.every((id) => validIds.has(id)),
    )
    .map((o) => ({ item_ids: o.item_ids, reasoning: o.reasoning }));

  // Consume the single shot regardless of outcome — one compose per guest. If
  // the pieces don't hold together, the gap is the honest answer, and they can
  // still sign up. A losing race (row already exists) just returns the winner's.
  const saved = await saveGeneration({ guestId, ip, outfits, occasion });
  if (!saved) {
    const now = await getGeneration(guestId);
    return NextResponse.json({
      ok: true,
      already: true,
      outfits: now?.outfits ?? outfits,
    });
  }

  const gap =
    plan.gap ||
    (outfits.length === 0
      ? "These don't hold together yet. Sign up and add pieces that pair."
      : "");
  return NextResponse.json({ ok: true, outfits, gap });
}
