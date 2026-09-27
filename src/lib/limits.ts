import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TIERS, toTier, type Tier } from "@/lib/whop/plans";

// A HARD, independent cap check — the backstop for when reserve_usage doesn't
// enforce, and the single gate every path that produces metered work runs
// through (both the enqueue routes and the worker itself). It does NOT trust
// reserve_usage's counter or return, and it does NOT use getPlan's tier
// resolution (whose status fallback can inflate the cap for an account that is
// actually free). Instead it:
//   1. reads the user's stored tier straight from the row (null/unknown -> free,
//      the safe floor) and looks up that tier's cap, and
//   2. counts what has ACTUALLY been produced this cycle from durable artifacts:
//        - render: one row per delivered try-on in `renders`.
//        - composition / shopping: jobs that reserved a slot and were not
//          terminally failed+refunded (status <> 'failed'). Because the handlers
//          now RESUME a job rather than mint a new generation on re-run, one job
//          is exactly one generation / consultation — so counting the jobs is the
//          real count, and a stuck (never-'done') job is no longer invisible the
//          way counting only 'done' jobs made it. A refunded failure drops out of
//          the count, so a failure is still never charged.
// If the count is at or over the cap, the operation is refused outright.

export type MeteredOp = "composition" | "render" | "shopping";

const CAP: Record<MeteredOp, (t: Tier) => number> = {
  composition: (t) => TIERS[t].compositionsPerMonth,
  render: (t) => TIERS[t].tryOnsPerMonth,
  shopping: (t) => TIERS[t].shoppingPerMonth,
};

export type CapState = { over: boolean; cap: number; used: number; tier: Tier };

async function tierOf(supabase: SupabaseClient, userId: string): Promise<Tier> {
  const { data: u } = await supabase
    .from("users")
    .select("plan_tier")
    .eq("id", userId)
    .maybeSingle();
  return u?.plan_tier ? toTier(u.plan_tier as string) : "free";
}

async function usedThisCycle(
  supabase: SupabaseClient,
  userId: string,
  op: MeteredOp,
  windowStartIso: string,
  excludeJobId?: string,
): Promise<number> {
  if (op === "render") {
    const { count } = await supabase
      .from("renders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", windowStartIso);
    return count ?? 0;
  }
  // Non-failed composition/shopping jobs this cycle. A job being RUN excludes
  // itself (excludeJobId), so it can finish without counting against its own cap.
  let q = supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("kind", op)
    .neq("status", "failed")
    .gte("created_at", windowStartIso);
  if (excludeJobId) q = q.neq("id", excludeJobId);
  const { count } = await q;
  return count ?? 0;
}

export async function atOrOverCap(
  supabase: SupabaseClient,
  userId: string,
  op: MeteredOp,
  windowStartIso: string,
  opts?: { excludeJobId?: string },
): Promise<CapState> {
  const tier = await tierOf(supabase, userId);
  const cap = CAP[op](tier);
  const used = await usedThisCycle(supabase, userId, op, windowStartIso, opts?.excludeJobId);
  return { over: used >= cap, cap, used, tier };
}
