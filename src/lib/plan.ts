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
// PAID_OVERRIDE=1 forces paid across an environment — the founder's render
// testing would otherwise be blocked, since every account is 'none' today. It
// is the same escape hatch as the RENDER_*_LIMIT overrides: set it in a testing
// environment only, never in real production.

export const FREE_PIECE_LIMIT = 15;

function limitFromEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export const PRO_PIECE_LIMIT = limitFromEnv("PRO_PIECE_LIMIT", 50);

const PAID_STATUSES = new Set(["active", "trialing", "past_due", "pro", "paid"]);

export function paidOverride(): boolean {
  return process.env.PAID_OVERRIDE === "1";
}

export function isPaidStatus(status: string | null | undefined): boolean {
  if (paidOverride()) return true;
  return !!status && PAID_STATUSES.has(status);
}

export function pieceLimitFor(paid: boolean): number {
  return paid ? PRO_PIECE_LIMIT : FREE_PIECE_LIMIT;
}

export type Plan = {
  paid: boolean;
  status: string;
  pieceLimit: number;
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
  const paid = isPaidStatus(status);
  return { paid, status, pieceLimit: pieceLimitFor(paid) };
}
