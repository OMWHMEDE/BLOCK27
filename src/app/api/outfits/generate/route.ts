import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { composeOutfits } from "@/lib/brain/composeOutfits";
import { getPlan } from "@/lib/plan";
import { ERR_GENERIC } from "@/lib/support";
import type { GarmentAnalysis } from "@/lib/brain/types";

// Node runtime + room for a reasoning call.
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

  // Optional context in the user's own words. Empty/absent → default behaviour.
  const body = (await request.json().catch(() => ({}))) as { occasion?: unknown };
  const occasion =
    typeof body.occasion === "string" ? body.occasion.trim().slice(0, 200) : "";

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

  // Composition allowance — per-tier monthly cap, reserved before the brain
  // call and refunded on failure. Same billing-anchored window as try-ons.
  const userPlan = await getPlan(user.id);
  const periodStart = userPlan.windowStart.toISOString();
  if (!userPlan.exempt) {
    const { data: reserved, error: reserveErr } = await supabase.rpc(
      "reserve_usage",
      {
        p_kind: "composition",
        p_period_start: periodStart,
        p_cap: userPlan.compositionsPerMonth,
      },
    );
    if (reserveErr) {
      // Fail closed — don't compose if the cap can't be checked.
      console.error("[outfits] reserve_usage failed", reserveErr.message);
      return NextResponse.json(
        { ok: false, error: "Couldn't check your plan just now. Try again in a moment." },
        { status: 503 },
      );
    }
    if (!reserved) {
      // Soft, on-brand: shown as an ash note (via gap), existing outfits kept.
      return NextResponse.json({
        ok: true,
        count: 0,
        gap: `You've used all ${userPlan.compositionsPerMonth} generations this cycle. Upgrade for more.`,
      });
    }
  }

  try {
    const plan = await composeOutfits(garments, occasion);

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
    // A failed generation must not burn the reserved composition slot.
    if (!userPlan.exempt) {
      const { error: relErr } = await supabase.rpc("release_usage", {
        p_kind: "composition",
        p_period_start: periodStart,
      });
      if (relErr) console.error("[outfits] release_usage failed", relErr.message);
    }
    const message = err instanceof Error ? err.message : "Generation failed";
    console.error("[outfits] generate failed", message);
    return NextResponse.json({ ok: false, error: ERR_GENERIC }, { status: 500 });
  }
}
