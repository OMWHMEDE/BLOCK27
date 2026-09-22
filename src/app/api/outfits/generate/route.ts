import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/server";
import { composeOutfits } from "@/lib/brain/composeOutfits";
import { getUserLanguage } from "@/lib/lang";
import { touchLastActive } from "@/lib/biometric";
import { getPlan } from "@/lib/plan";
import { paymentsOpen } from "@/lib/payments";
import { ERR_GENERIC } from "@/lib/support";
import type { GarmentAnalysis } from "@/lib/brain/types";

// Node runtime + room for a reasoning call.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { supabase, user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await touchLastActive(supabase, user.id);

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
      gapPoints: ["One analyzed piece isn't an outfit. Add a few more."],
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
      const line = `You've used all ${userPlan.compositionsPerMonth} generations this cycle.${paymentsOpen() ? " Upgrade for more." : ""}`;
      return NextResponse.json({ ok: true, count: 0, gap: line, gapPoints: [line] });
    }
  }

  try {
    const language = await getUserLanguage(supabase, user.id);
    const plan = await composeOutfits(garments, occasion, language);

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

    // Distinct gap points from the brain; fall back to a single point only when a
    // composition genuinely produced nothing.
    let gapPoints = plan.gap_points ?? [];
    if (valid.length === 0 && gapPoints.length === 0) {
      gapPoints = ["Nothing here holds together yet. Add pieces that pair."];
    }
    // The single line kept for existing consumers; "" when there is no gap.
    const gap = gapPoints.join(" ");

    // Persist the latest gap (single line + points) so a client can show it
    // without regenerating. This reflects a real composition only (empty means
    // "nothing missing", distinct from null = "never generated"). Best-effort: a
    // persist failure must not fail a generation that already succeeded.
    const { error: gapErr } = await supabase
      .from("users")
      .update({
        latest_gap: gap,
        latest_gap_points: gapPoints,
        latest_gap_at: new Date().toISOString(),
      })
      .eq("id", user.id);
    if (gapErr) console.error("[outfits] latest_gap persist failed", gapErr.message);

    return NextResponse.json({ ok: true, count: valid.length, gap, gapPoints });
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
