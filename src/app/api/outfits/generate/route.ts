import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { composeOutfits } from "@/lib/brain/composeOutfits";
import type { GarmentAnalysis } from "@/lib/brain/types";

// Node runtime + room for a reasoning call.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Text only — the stored analyses. Photos are never re-read.
  const { data: rows } = await supabase
    .from("garments")
    .select("id, analysis")
    .eq("user_id", user.id)
    .eq("status", "analyzed");

  const garments = (rows ?? [])
    .filter((g) => g.analysis)
    .map((g) => ({ id: g.id as string, analysis: g.analysis as GarmentAnalysis }));

  // Thin wardrobe: don't spend a call to be told the obvious.
  if (garments.length < 2) {
    return NextResponse.json({
      ok: true,
      count: 0,
      gap: "One analyzed piece isn't an outfit. Add a few more.",
    });
  }

  try {
    const plan = await composeOutfits(garments);

    // Keep only outfits that reference real garments and are actually outfits.
    const validIds = new Set(garments.map((g) => g.id));
    const valid = plan.outfits.filter(
      (o) =>
        o.item_ids.length >= 2 &&
        o.item_ids.every((id) => validIds.has(id)),
    );

    // This generation replaces the current set.
    const { error: delErr } = await supabase
      .from("outfits")
      .delete()
      .eq("user_id", user.id);
    if (delErr) throw new Error(`store failed: ${delErr.message}`);

    if (valid.length > 0) {
      const { error: insErr } = await supabase.from("outfits").insert(
        valid.map((o) => ({
          user_id: user.id,
          item_ids: o.item_ids,
          reasoning: o.reasoning,
        })),
      );
      if (insErr) throw new Error(`store failed: ${insErr.message}`);
    }

    const gap =
      plan.gap ||
      (valid.length === 0
        ? "Nothing here holds together yet. Add pieces that pair."
        : "");
    return NextResponse.json({ ok: true, count: valid.length, gap });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("[outfits] generate failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
