import "server-only";
import { createClient } from "@/lib/supabase/server";

// The plan line. Free is the default (users.subscription_status = 'none'). Paid
// unlocks the hand — try-on renders — and a larger wardrobe. Two rules are coded
// here and nowhere else:
//
//   FREE = 15 pieces, 0 try-ons.
//
// The paid-tier piece cap is intentionally NOT hardcoded — it reads from an env
// so it can move without a deploy. Stripe isn't wired yet, so a paid account is
// one whose subscription_status is a live status (set directly for now).
//
// PAID_OVERRIDE_UIDS is a SCOPED testing allowlist: a comma-separated list of
// user ids that get paid access regardless of their status. It is per-account,
// never global — only the ids in the list are affected, everyone else follows
// their real status. Empty or unset means nobody is overridden (identical to no
// override). This replaces the old global PAID_OVERRIDE=1 switch, which granted
// paid to EVERY user and was unsafe to leave on. Setting PAID_OVERRIDE has no
// effect anymore.

export const FREE_PIECE_LIMIT = 15;

function limitFromEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export const PRO_PIECE_LIMIT = limitFromEnv("PRO_PIECE_LIMIT", 50);

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

// Pure status check — no override. The override is a per-user concern and is
// applied in getPlan, which has the user id.
export function isPaidStatus(status: string | null | undefined): boolean {
  return !!status && PAID_STATUSES.has(status);
}

export function pieceLimitFor(paid: boolean): number {
  return paid ? PRO_PIECE_LIMIT : FREE_PIECE_LIMIT;
}

export type Plan = {
  paid: boolean;
  status: string;
  pieceLimit: number;
  // The single test-account bypass. True only when this user's id is in
  // PAID_OVERRIDE_UIDS. When true, EVERY usage limit is off for this account —
  // plan gate, daily/monthly render caps, piece cap. It covers usage limits
  // ONLY: it never affects moderation, RLS, or account deletion. Always false
  // for anyone not on the allowlist, so their real limits are untouched.
  exempt: boolean;
};

// Resolve a user's plan from their row. A missing row (shouldn't happen for a
// real user) reads as free — fail toward the more restrictive tier, never the
// looser one. The render gate depends on this being conservative.
export async function getPlan(userId: string): Promise<Plan> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("subscription_status")
    .eq("id", userId)
    .maybeSingle();

  const status = (data?.subscription_status as string | null) ?? "none";
  // The one allowlist, read once here and surfaced as `exempt` for every limit
  // check to reuse — so there is a single source of truth, not a bypass per cap.
  const exempt = isOverriddenUid(userId);
  // Paid if exempt, OR their real status is a paid one.
  const paid = exempt || isPaidStatus(status);
  return { paid, status, pieceLimit: pieceLimitFor(paid), exempt };
}
