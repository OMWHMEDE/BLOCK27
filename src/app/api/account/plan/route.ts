import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plan";
import { TIERS } from "@/lib/whop/plans";

// The user's effective plan and this cycle's usage, resolved exactly as the
// server enforces it — getPlan applies the stored tier AND the PAID_OVERRIDE_UIDS
// test override (exempt: caps off). Bearer-authed like the rest of the app.
//
//   limits    — the tier's caps.
//   used      — this billing-anchored cycle so far: pieces (a live count),
//               generations / tryOns / shopping (the reserved usage counters,
//               refunded on failure, so they match what the caps enforce against).
//   remaining — limits − used, floored at 0; null when exempt (no caps apply).
export const runtime = "nodejs";

const KINDS = ["render", "composition", "shopping"] as const;

export async function GET(request: Request) {
  const { supabase, user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const plan = await getPlan(user.id);
  const periodStart = plan.windowStart.toISOString();

  const [countersRes, piecesRes] = await Promise.all([
    supabase
      .from("usage_counters")
      .select("kind, used")
      .eq("user_id", user.id)
      .eq("period_start", periodStart)
      .in("kind", KINDS as unknown as string[]),
    supabase
      .from("garments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const counter: Record<(typeof KINDS)[number], number> = {
    render: 0,
    composition: 0,
    shopping: 0,
  };
  for (const row of countersRes.data ?? []) {
    const k = row.kind as (typeof KINDS)[number];
    if (k in counter) counter[k] = Number(row.used) || 0;
  }

  const limits = {
    pieces: plan.pieceLimit,
    generations: plan.compositionsPerMonth,
    tryOns: plan.tryOnsPerMonth,
    shopping: plan.shoppingPerMonth,
  };
  const used = {
    pieces: piecesRes.count ?? 0,
    generations: counter.composition,
    tryOns: counter.render,
    shopping: counter.shopping,
  };
  const remaining = plan.exempt
    ? null
    : {
        pieces: Math.max(limits.pieces - used.pieces, 0),
        generations: Math.max(limits.generations - used.generations, 0),
        tryOns: Math.max(limits.tryOns - used.tryOns, 0),
        shopping: Math.max(limits.shopping - used.shopping, 0),
      };

  return NextResponse.json({
    tier: plan.tier,
    tierLabel: TIERS[plan.tier].label,
    paid: plan.paid,
    exempt: plan.exempt,
    status: plan.status,
    windowStart: periodStart,
    limits,
    used,
    remaining,
  });
}
