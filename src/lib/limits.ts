import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TIERS, toTier, type Tier } from "@/lib/whop/plans";

// A HARD, independent cap check — the backstop for when reserve_usage doesn't
// enforce. It does NOT trust reserve_usage's counter or return, and it does NOT
// use getPlan's tier resolution (whose status fallback can inflate the cap for an
// account that is actually free). Instead it:
//   1. reads the user's stored tier straight from the row (null/unknown -> free,
//      the safe floor) and looks up that tier's cap, and
//   2. counts what has ACTUALLY been produced this cycle from the real work
//      tables — completed jobs for generation/shopping, delivered rows for
//      renders — never usage_counters.
// If the count is at or over the cap, the operation is refused outright.

export type MeteredOp = "composition" | "render" | "shopping";

const CAP: Record<MeteredOp, (t: Tier) => number> = {
  composition: (t) => TIERS[t].compositionsPerMonth,
  render: (t) => TIERS[t].tryOnsPerMonth,
  shopping: (t) => TIERS[t].shoppingPerMonth,
};

export type CapState = { over: boolean; cap: number; used: number; tier: Tier };

export async function atOrOverCap(
  supabase: SupabaseClient,
  userId: string,
  op: MeteredOp,
  windowStartIso: string,
): Promise<CapState> {
  // Tier straight from the row — the safe floor is free.
  const { data: u } = await supabase
    .from("users")
    .select("plan_tier")
    .eq("id", userId)
    .maybeSingle();
  const tier: Tier = u?.plan_tier ? toTier(u.plan_tier as string) : "free";
  const cap = CAP[op](tier);

  // What was actually used this cycle, from the source-of-truth work tables.
  let used = 0;
  if (op === "render") {
    // One row per delivered try-on.
    const { count } = await supabase
      .from("renders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", windowStartIso);
    used = count ?? 0;
  } else {
    // One completed job per successful generation / consultation. A failed job
    // never reaches 'done', so it never counts — a failure is never charged.
    const { count } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("kind", op)
      .eq("status", "done")
      .gte("created_at", windowStartIso);
    used = count ?? 0;
  }

  return { over: used >= cap, cap, used, tier };
}
