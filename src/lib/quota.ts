import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plan";
import { TIERS, type Tier } from "@/lib/whop/plans";

// Read-only usage for the settings screen. Try-on is off for launch, so
// tryOnsPerMonth is 0 for every tier right now (the field is kept so the screen
// still compiles for when the hand returns). The piece cap is plan-aware and
// lives in @/lib/plan.

export type Quota = {
  tier: Tier;
  tierLabel: string;
  rendersMonth: number;
  tryOnsPerMonth: number;
  pieces: number;
  pieceLimit: number;
  // Test-exempt (PAID_OVERRIDE_UIDS): the counts are still shown, but none of
  // the limits bind. The settings screen reads this to say so plainly.
  exempt: boolean;
};

// RLS scopes every count to the user.
export async function getQuota(userId: string): Promise<Quota> {
  const supabase = await createClient();
  const plan = await getPlan(userId);

  // Display counts the user's actual delivered renders within the SAME
  // billing-anchored window the cap is enforced against (plan.windowStart), so
  // "used this cycle" on settings lines up with what the render gate allows.
  const windowStart = plan.windowStart.toISOString();

  const [monthRes, pieceRes] = await Promise.all([
    supabase
      .from("renders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", windowStart),
    supabase
      .from("garments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  return {
    tier: plan.tier,
    tierLabel: TIERS[plan.tier].label,
    rendersMonth: monthRes.count ?? 0,
    tryOnsPerMonth: plan.tryOnsPerMonth,
    pieces: pieceRes.count ?? 0,
    pieceLimit: plan.pieceLimit,
    exempt: plan.exempt,
  };
}
