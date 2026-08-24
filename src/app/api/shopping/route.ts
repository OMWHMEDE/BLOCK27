import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recommendGaps } from "@/lib/brain/recommendGaps";
import { searchUrl } from "@/lib/shopping/searchUrl";
import { getPlan } from "@/lib/plan";
import { paymentsOpen } from "@/lib/payments";
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

  // The one cold question: what are you working with? A positive whole number,
  // or null when skipped — then the brain advises without allocating.
  const body = (await request.json().catch(() => ({}))) as { budget?: unknown };
  const raw = Number(body.budget);
  const budget =
    Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), 1_000_000) : null;

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
      advice:
        "Nothing to shop for yet. Add the pieces you already own first — I audit a wardrobe, I don't guess into empty space.",
    });
  }

  // Consultation allowance — per-tier monthly cap, reserved before the brain
  // call and refunded on failure. Same billing-anchored window as try-ons.
  const userPlan = await getPlan(user.id);
  const periodStart = userPlan.windowStart.toISOString();
  if (!userPlan.exempt) {
    const { data: reserved, error: reserveErr } = await supabase.rpc(
      "reserve_usage",
      {
        p_kind: "shopping",
        p_period_start: periodStart,
        p_cap: userPlan.shoppingPerMonth,
      },
    );
    if (reserveErr) {
      // Fail closed — don't consult if the cap can't be checked.
      console.error("[shopping] reserve_usage failed", reserveErr.message);
      return NextResponse.json(
        { ok: false, error: "Couldn't check your plan just now. Try again in a moment." },
        { status: 503 },
      );
    }
    if (!reserved) {
      // Soft, on-brand: shown as an ash note by ShopGaps.
      return NextResponse.json({
        ok: true,
        note: `You've used all ${userPlan.shoppingPerMonth} consultations this cycle.${paymentsOpen() ? " Upgrade for more." : ""}`,
      });
    }
  }

  try {
    const plan = await recommendGaps(garments, budget);

    // Recompute the money server-side — never trust the model's arithmetic.
    const picks = plan.picks ?? [];
    const spent = picks.reduce(
      (sum, p) => sum + (Number.isFinite(p.spend) && p.spend > 0 ? Math.floor(p.spend) : 0),
      0,
    );
    const remaining = budget != null ? budget - spent : null;

    // This consultation replaces the last one — picks and the session frame.
    const [{ error: delRecErr }, { error: delSessErr }] = await Promise.all([
      supabase.from("recommendations").delete().eq("user_id", user.id),
      supabase.from("shopping_sessions").delete().eq("user_id", user.id),
    ]);
    if (delRecErr) throw new Error(`store failed: ${delRecErr.message}`);
    if (delSessErr) throw new Error(`store failed: ${delSessErr.message}`);

    if (picks.length > 0) {
      const { error: insErr } = await supabase.from("recommendations").insert(
        picks.map((p, i) => {
          const spend =
            Number.isFinite(p.spend) && p.spend > 0 ? Math.floor(p.spend) : null;
          return {
            user_id: user.id,
            category: p.category,
            title: p.title,
            look_for: p.look_for,
            why: p.why,
            price_low: p.price_low,
            price_high: p.price_high,
            spend,
            search_query: p.search_query,
            // The light path: a ready-to-shop search URL in the affiliate seam.
            affiliate_url: searchUrl(p.search_query) || null,
            priority: i, // brain already ordered most-unlocking first
          };
        }),
      );
      if (insErr) throw new Error(`store failed: ${insErr.message}`);
    }

    const { error: sessErr } = await supabase.from("shopping_sessions").insert({
      user_id: user.id,
      budget,
      spent,
      remaining,
      solid: plan.solid,
      advice: plan.advice ?? "",
      gaps: plan.gaps ?? [],
    });
    if (sessErr) throw new Error(`store failed: ${sessErr.message}`);

    return NextResponse.json({
      ok: true,
      count: picks.length,
      solid: plan.solid,
      advice: plan.advice,
    });
  } catch (err) {
    // A failed consultation must not burn the reserved slot.
    if (!userPlan.exempt) {
      const { error: relErr } = await supabase.rpc("release_usage", {
        p_kind: "shopping",
        p_period_start: periodStart,
      });
      if (relErr) console.error("[shopping] release_usage failed", relErr.message);
    }
    const message = err instanceof Error ? err.message : "Consultation failed";
    console.error("[shopping] failed", message);
    return NextResponse.json({ ok: false, error: ERR_GENERIC }, { status: 500 });
  }
}
