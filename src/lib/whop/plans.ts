// The plan tiers and their limits — the single source of truth the pricing page,
// the quota gate, and the Whop webhook all read from. Kept free of `server-only`
// so both server (webhook mapping) and client (checkout embed) can import the
// tier shapes; only the secret WHOP_API_KEY / WHOP_WEBHOOK_SECRET live server-side.
//
// Whop plan ids are NOT secret — they appear in checkout URLs — so they are
// public envs (NEXT_PUBLIC_WHOP_PLAN_*), shared by the client embed and the
// server webhook's plan->tier mapping. They are unset until the plans are
// created in the Whop dashboard; every helper degrades safely to "unconfigured".

// Two tiers: Free, and the single paid tier BLOCK27 (monthly or yearly billing —
// same access either way). The old four-tier model (premium/pro/boss) is retired;
// toTier() below still collapses those legacy values to the paid tier so a stored
// plan_tier from before the change resolves correctly.
export type Tier = "free" | "block27";
export type PaidTier = Exclude<Tier, "free">;
// The paid tier bills monthly or yearly; the tier (access) is identical for both.
export type BillingPeriod = "monthly" | "yearly";

export type TierLimits = {
  label: string;
  priceUsd: number; // monthly, USD
  priceYearlyUsd: number; // yearly, USD (0 for free)
  pieces: number;
  // Monthly caps on the brain calls (metered server-side per user). Every tier
  // is metered — the free stylist is free up to its monthly allowance.
  compositionsPerMonth: number;
  shoppingPerMonth: number;
  // Try-on (the hand) is switched off for launch, so its per-tier allowance is
  // intentionally not part of the tier definition right now. When it returns, add
  // tryOnsPerMonth back here and wire it through getPlan / limits.ts.
};

// The single source of truth for every plan number. The pricing page, the quota
// gate, and the Whop webhook all read from here — change a limit once, here, and
// it is correct everywhere.
export const TIERS: Record<Tier, TierLimits> = {
  free: {
    label: "Free",
    priceUsd: 0,
    priceYearlyUsd: 0,
    pieces: 10,
    compositionsPerMonth: 5,
    shoppingPerMonth: 3,
  },
  block27: {
    label: "BLOCK27",
    priceUsd: 9.99,
    priceYearlyUsd: 79.99,
    pieces: 150,
    compositionsPerMonth: 45,
    shoppingPerMonth: 15,
  },
};

export const TIER_ORDER: Tier[] = ["free", "block27"];
export const PAID_TIERS: PaidTier[] = ["block27"];

export function isTier(v: unknown): v is Tier {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(TIERS, v);
}

// Normalise a stored value to a valid tier. Legacy paid tiers (premium/pro/boss)
// collapse to the single paid tier; anything unrecognised reads as free (fail
// toward the least access, never more).
export function toTier(v: string | null | undefined): Tier {
  if (v === "free" || v === "block27") return v;
  if (v === "premium" || v === "pro" || v === "boss") return "block27";
  return "free";
}

// Whop plan env per tier and billing period:
//   NEXT_PUBLIC_WHOP_PLAN_BLOCK27          — monthly
//   NEXT_PUBLIC_WHOP_PLAN_BLOCK27_YEARLY   — yearly
function planEnv(tier: PaidTier, period: BillingPeriod): string | undefined {
  const suffix = period === "yearly" ? "_YEARLY" : "";
  const raw = process.env[`NEXT_PUBLIC_WHOP_PLAN_${tier.toUpperCase()}${suffix}`];
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

// The public Whop plan id to open checkout for this tier + period, or null when
// that plan hasn't been wired up yet. The checkout UI hides an option when null.
export function whopPlanId(
  tier: PaidTier,
  period: BillingPeriod = "monthly",
): string | null {
  return planEnv(tier, period) ?? null;
}

// Reverse map used by the webhook: which tier does this Whop plan id grant? Checks
// both billing periods, since monthly and yearly are the same tier. null when the
// id matches no configured plan (fail closed — grant nothing rather than guess).
export function tierForWhopPlan(planId: string | null | undefined): PaidTier | null {
  if (!planId) return null;
  for (const tier of PAID_TIERS) {
    for (const period of ["monthly", "yearly"] as BillingPeriod[]) {
      if (planEnv(tier, period) === planId) return tier;
    }
  }
  return null;
}
