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
  const guestId = await readGuestId(request);
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

  const gap =
    plan.gap ||
    (outfits.length === 0
      ? "These don't hold together yet. Add pieces that pair, then try again."
      : "");

  // Nothing usable composed. Do NOT consume the single shot — the guest can add
  // better pieces and retry (no row saved means the next call re-composes). Log
  // the raw plan against the ids we actually have, so an item_ids mismatch (the
  // brain echoed ids we don't own) is visible and distinct from a genuinely
  // incoherent wardrobe (the brain returned no outfits at all).
  if (outfits.length === 0) {
    console.warn(
      "[guest] no usable outfits — not saved (retryable)",
      "| rawOutfitCount:",
      plan.outfits.length,
      "| rawOutfitItemIds:",
      JSON.stringify(plan.outfits.map((o) => o.item_ids)),
      "| validIds:",
      JSON.stringify([...validIds]),
      "| gap:",
      plan.gap,
    );
    return NextResponse.json({ ok: true, outfits: [], gap });
  }

  // A real result consumes the single shot — one preview compose per guest. A
  // losing race (row already exists) just returns the winner's saved outfits.
  const saved = await saveGeneration({ guestId, ip, outfits, occasion });
  if (!saved) {
    const now = await getGeneration(guestId);
    return NextResponse.json({
      ok: true,
      already: true,
      outfits: now?.outfits ?? outfits,
    });
  }

  return NextResponse.json({ ok: true, outfits, gap });
}
