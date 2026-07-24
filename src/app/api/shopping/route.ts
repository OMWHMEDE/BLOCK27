import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recommendGaps } from "@/lib/brain/recommendGaps";
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
    .select("analysis")
    .eq("user_id", user.id)
    .eq("status", "analyzed");

  const garments = (rows ?? [])
    .filter((g) => g.analysis)
    .map((g) => ({ analysis: g.analysis as GarmentAnalysis }));

  // Nothing to reason from. I advise against what you own, not in a vacuum.
  if (garments.length === 0) {
    return NextResponse.json({
      ok: true,
      count: 0,
      solid: false,
      verdict:
        "Nothing to shop for yet. Add the pieces you already own first — I recommend around a wardrobe, not into empty space.",
    });
  }

  try {
    const plan = await recommendGaps(garments);

    // This consultation replaces the last one.
    const { error: delErr } = await supabase
      .from("recommendations")
      .delete()
      .eq("user_id", user.id);
    if (delErr) throw new Error(`store failed: ${delErr.message}`);

    const recs = plan.recommendations ?? [];
    if (recs.length > 0) {
      const { error: insErr } = await supabase.from("recommendations").insert(
        recs.map((r, i) => ({
          user_id: user.id,
          category: r.category,
          title: r.title,
          look_for: r.look_for,
          why: r.why,
          price_low: r.price_low,
          price_high: r.price_high,
          search_query: r.search_query,
          priority: i, // brain already ordered most-unlocking first
        })),
      );
      if (insErr) throw new Error(`store failed: ${insErr.message}`);
    }

    return NextResponse.json({
      ok: true,
      count: recs.length,
      solid: plan.solid,
      verdict: plan.verdict,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Consultation failed";
    console.error("[shopping] failed", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
