import { PAID_TIERS, type PaidTier } from "@/lib/whop/plans";
import type { EntitlementAction } from "@/lib/apple/types";

// iOS prices, set higher than web to absorb Apple's commission. Reference/display
// only — StoreKit shows the real localized price and entitlement never trusts a
// price sent from a client. The tier is what grants access; this is the number a
// pricing screen would echo. (Web prices live in @/lib/whop/plans TIERS.priceUsd.)
export const APPLE_PRICES_USD: Record<PaidTier, number> = {
  premium: 16.99,
  pro: 27.99,
  boss: 54.99,
};

// Apple product ids are configured in App Store Connect and ship inside the app,
// so they are not secret — but they differ per environment, so they come from env
// (APPLE_PRODUCT_PREMIUM / _PRO / _BOSS), mirroring the Whop plan-id envs. Unset
// means that tier isn't purchasable on iOS yet.
function productEnv(tier: PaidTier): string | undefined {
  const raw = process.env[`APPLE_PRODUCT_${tier.toUpperCase()}`];
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export function appleProductId(tier: PaidTier): string | null {
  return productEnv(tier) ?? null;
}

// Reverse map used by ingestion: which tier does this Apple product grant? null
// when it matches no configured product — fail closed, grant nothing rather than
// guess a tier.
export function tierForAppleProduct(
  productId: string | null | undefined,
): PaidTier | null {
  if (!productId) return null;
  for (const tier of PAID_TIERS) {
    if (productEnv(tier) === productId) return tier;
  }
  return null;
}

// The app's bundle id, used to reject notifications/transactions for other apps.
// Optional: unset skips the check (dev), set enforces it.
export function appleBundleId(): string | null {
  const raw = process.env.APPLE_BUNDLE_ID?.trim();
  return raw ? raw : null;
}

// Map an App Store Server Notification V2 (type, subtype) to what it means for the
// user's entitlement. Grants on a new/renewed active subscription; revokes on
// expiry, refund, or revocation; ignores the purely informational events (renewal
// preference toggles, price-increase consents, grace-period holds where access
// continues). Unknown types are ignored and logged by the caller.
export function classifyNotification(
  notificationType: string | undefined,
  subtype: string | undefined,
): EntitlementAction {
  switch (notificationType) {
    case "SUBSCRIBED": // INITIAL_BUY or RESUBSCRIBE
    case "DID_RENEW": // a renewal succeeded
    case "OFFER_REDEEMED": // redeemed into an active subscription
      return "grant";

    case "EXPIRED": // subscription lapsed
    case "GRACE_PERIOD_EXPIRED": // billing retry ran out — access ends now
    case "REFUND": // Apple refunded the purchase
    case "REVOKE": // Family Sharing access revoked
      return "revoke";

    // DID_CHANGE_RENEWAL_STATUS / _PREF: auto-renew toggle or a pending up/down-
    // grade that only takes effect at the next renewal (a DID_RENEW we will act
    // on). DID_FAIL_TO_RENEW while still in grace: access continues. Everything
    // else here is informational.
    default:
      void subtype;
      return "ignore";
  }
}
