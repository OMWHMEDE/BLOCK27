// The plan tiers and their limits — the single source of truth the pricing page,
// the quota gate, and the Whop webhook all read from. Kept free of `server-only`
// so both server (webhook mapping) and client (checkout embed) can import the
// tier shapes; only the secret WHOP_API_KEY / WHOP_WEBHOOK_SECRET live server-side.
//
// Whop plan ids are NOT secret — they appear in checkout URLs — so they are
// public envs (NEXT_PUBLIC_WHOP_PLAN_*), shared by the client embed and the
// server webhook's plan->tier mapping. They are unset until the plans are
// created in the Whop dashboard; every helper degrades safely to "unconfigured".

export type Tier = "free" | "premium" | "pro" | "boss";
export type PaidTier = Exclude<Tier, "free">;

export type TierLimits = {
  label: string;
  priceUsd: number;
  pieces: number;
  tryOnsPerMonth: number;
  // null = not metered (free stylist access has no monthly composition cap).
  compositionsPerMonth: number | null;
};

// Matches /pricing exactly. If pricing changes, change it here and there.
export const TIERS: Record<Tier, TierLimits> = {
  free: {
    label: "Free",
    priceUsd: 0,
    pieces: 15,
    tryOnsPerMonth: 0,
    compositionsPerMonth: null,
  },
  premium: {
    label: "Premium",
    priceUsd: 14.99,
    pieces: 30,
    tryOnsPerMonth: 5,
    compositionsPerMonth: 10,
  },
  pro: {
    label: "Pro",
    priceUsd: 24.99,
    pieces: 60,
    tryOnsPerMonth: 10,
    compositionsPerMonth: 20,
  },
  boss: {
    label: "Boss",
    priceUsd: 49.99,
    pieces: 100,
    tryOnsPerMonth: 20,
    compositionsPerMonth: 45,
  },
};

export const TIER_ORDER: Tier[] = ["free", "premium", "pro", "boss"];
export const PAID_TIERS: PaidTier[] = ["premium", "pro", "boss"];

export function isTier(v: unknown): v is Tier {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(TIERS, v);
}

// Normalise a stored value to a valid tier — anything unrecognised reads as free
// (fail toward the least access, never more).
export function toTier(v: string | null | undefined): Tier {
  return isTier(v) ? v : "free";
}

function planEnv(tier: PaidTier): string | undefined {
  const raw = process.env[`NEXT_PUBLIC_WHOP_PLAN_${tier.toUpperCase()}`];
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

// The public Whop plan id to open checkout for this tier, or null when the plan
// hasn't been wired up yet. The checkout UI hides the tier when this is null.
export function whopPlanId(tier: PaidTier): string | null {
  return planEnv(tier) ?? null;
}

// Reverse map used by the webhook: which tier does this Whop plan id grant?
// null when the id doesn't match any configured plan (fail closed — grant
// nothing rather than guess a tier).
export function tierForWhopPlan(planId: string | null | undefined): PaidTier | null {
  if (!planId) return null;
  for (const tier of PAID_TIERS) {
    if (planEnv(tier) === planId) return tier;
  }
  return null;
}
