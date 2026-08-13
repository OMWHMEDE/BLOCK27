import "server-only";
import { createClient } from "@/lib/supabase/server";
import { TIERS, toTier, type Tier } from "@/lib/whop/plans";

// The plan line. The paid tier a user is on drives every usage limit: how many
// pieces their wardrobe holds and how many try-ons they get per month. The four
// tiers and their numbers live in @/lib/whop/plans (the same source /pricing
// reads); this file resolves a user to their tier and surfaces those limits.
//
//   Free 15 pieces / 0 try-ons · Premium 30/5 · Pro 60/10 · Boss 100/20
//
// The tier comes from users.plan_tier, written by the Whop webhook on payment.
// PAID_OVERRIDE_UIDS is a SCOPED testing allowlist: a comma-separated list of
// user ids that get full (Boss) access with all caps off, regardless of status.
// Per-account, never global — only listed ids are affected; empty/unset affects
// nobody. (Replaces the old global PAID_OVERRIDE switch, now ignored.)

// Kept for the guest→account migration, which caps carried-over pieces at the
// free allowance. Sourced from the tier config so there's one number.
export const FREE_PIECE_LIMIT = TIERS.free.pieces;

const PAID_STATUSES = new Set(["active", "trialing", "past_due", "pro", "paid"]);

// The override allowlist, parsed fresh each call (env is read at request time on
// the server). Trimmed, empty entries dropped — so "", " , ", and unset all
// yield an empty set and override nobody.
function paidOverrideUids(): Set<string> {
  const raw = process.env.PAID_OVERRIDE_UIDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );
}

// True only when this exact user id is on the testing allowlist. Never global.
export function isOverriddenUid(userId: string): boolean {
  return paidOverrideUids().has(userId);
}

// Pure status check — no override. Used as the fallback signal when the tier
// column isn't available yet.
export function isPaidStatus(status: string | null | undefined): boolean {
  return !!status && PAID_STATUSES.has(status);
}

export type Plan = {
  // The resolved tier. Drives the limits below.
  tier: Tier;
  // True for any paid tier (or a test-exempt account). The render/base gates
  // read this — a free account never reaches the hand.
  paid: boolean;
  status: string;
  // Wardrobe capacity and monthly try-on allowance for this tier.
  pieceLimit: number;
  tryOnsPerMonth: number;
  // The single test-account bypass. True only when this user's id is in
  // PAID_OVERRIDE_UIDS: EVERY usage limit is off (piece cap, try-on cap, plan
  // gate). Usage limits ONLY — never moderation, RLS, or account deletion.
  exempt: boolean;
};

// Resolve a user's plan from their row. A missing row (shouldn't happen for a
// real user) reads as free — fail toward the more restrictive tier, never the
// looser one. The render gate depends on this being conservative.
export async function getPlan(userId: string): Promise<Plan> {
  const supabase = await createClient();

  // Read the tier column alongside status. If migration 0011 hasn't been run
  // yet, selecting plan_tier errors on the missing column — fall back to a
  // status-only read so nothing 500s during the migration window.
  let status = "none";
  let tierRaw: string | null = null;

  const withTier = await supabase
    .from("users")
    .select("subscription_status, plan_tier")
    .eq("id", userId)
    .maybeSingle();

  if (withTier.error) {
    const fallback = await supabase
      .from("users")
      .select("subscription_status")
      .eq("id", userId)
      .maybeSingle();
    status = (fallback.data?.subscription_status as string | null) ?? "none";
  } else {
    status = (withTier.data?.subscription_status as string | null) ?? "none";
    tierRaw = (withTier.data?.plan_tier as string | null) ?? null;
  }

  const exempt = isOverriddenUid(userId);

  // Effective tier: test accounts get Boss limits (everything, with caps off);
  // otherwise the stored plan_tier. When plan_tier is absent (pre-migration), a
  // paid status still grants paid access — default it to Pro so such an account
  // isn't stranded on free piece limits.
  let tier: Tier;
  if (exempt) tier = "boss";
  else if (tierRaw) tier = toTier(tierRaw);
  else tier = isPaidStatus(status) ? "pro" : "free";

  const limits = TIERS[tier];
  const paid = exempt || tier !== "free" || isPaidStatus(status);

  return {
    tier,
    paid,
    status,
    pieceLimit: limits.pieces,
    tryOnsPerMonth: limits.tryOnsPerMonth,
    exempt,
  };
}
