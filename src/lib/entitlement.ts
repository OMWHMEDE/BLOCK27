import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PaidTier } from "@/lib/whop/plans";

// The single place a user's paid entitlement is written. Every billing provider
// (Whop today, Apple next) routes through here, so the two never clobber each
// other: a grant records WHICH source owns the entitlement, and a revoke only
// frees an entitlement its own source granted. plan_tier / subscription_status /
// plan_anchor_at stay the resolved truth getPlan reads — this module is their
// only writer besides the read-only PAID_OVERRIDE_UIDS test bypass.
//
// SERVER ONLY, service-role: writing plan_tier is privileged and RLS-exempt by
// design, never reachable from a user client. The admin client is created here so
// the privilege lives in one place and callers can't forget it.

export type EntitlementSource = "whop" | "apple";

// A provider's own reference for the entitlement, stored in that provider's own
// column so Whop and Apple identifiers never overwrite each other.
export type EntitlementRef =
  | { source: "whop"; whopMembershipId: string | null }
  | {
      source: "apple";
      appleOriginalTransactionId: string | null;
      appleProductId?: string | null;
    };

// Grant or renew a paid entitlement. Returns the number of user rows updated —
// 0 means no users row matched that id (a signed, mapped event for an unknown
// user), which the caller should surface loudly. plan_anchor_at is set once, on
// the first grant, and never moved on a renewal, so the usage window is stable.
export async function setEntitlement(params: {
  userId: string;
  tier: PaidTier;
  ref: EntitlementRef;
}): Promise<number> {
  const { userId, tier, ref } = params;
  const admin = createAdminClient();

  const patch: Record<string, unknown> = {
    plan_tier: tier,
    subscription_status: "active",
    entitlement_source: ref.source,
  };
  if (ref.source === "whop") {
    patch.whop_membership_id = ref.whopMembershipId;
  } else {
    patch.apple_original_transaction_id = ref.appleOriginalTransactionId;
    patch.apple_product_id = ref.appleProductId ?? null;
  }

  const { data: rows, error } = await admin
    .from("users")
    .update(patch)
    .eq("id", userId)
    .select("id");
  if (error) throw new Error(`setEntitlement: ${error.message}`);
  const updated = rows?.length ?? 0;
  if (updated === 0) return 0;

  const { error: anchorErr } = await admin
    .from("users")
    .update({ plan_anchor_at: new Date().toISOString() })
    .eq("id", userId)
    .is("plan_anchor_at", null);
  // Non-fatal: the grant already landed, and a missing anchor falls back to
  // created_at in getPlan. Log, never fail the caller's webhook over it.
  if (anchorErr) {
    console.error("[entitlement] anchor set failed", anchorErr.message);
  }

  return updated;
}

// Revoke to free. Guarded by source: a provider may only clear an entitlement it
// owns, so a stray event from one provider can't wipe the other's. Identify by
// user id (preferred), or by the provider's own reference when a revoke arrives
// with no user metadata — the Whop membership id, or the Apple original
// transaction id. Callers must supply at least one identifier.
export async function clearEntitlement(params: {
  source: EntitlementSource;
  userId?: string | null;
  whopMembershipId?: string | null;
  appleOriginalTransactionId?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const patch = {
    plan_tier: "free",
    subscription_status: "none",
    entitlement_source: "none",
    plan_anchor_at: null,
  };

  let query;
  if (params.userId) {
    // The id path still checks source, so a Whop event can't clear an Apple row.
    query = admin
      .from("users")
      .update(patch)
      .eq("id", params.userId)
      .eq("entitlement_source", params.source);
  } else if (params.source === "whop" && params.whopMembershipId) {
    query = admin
      .from("users")
      .update(patch)
      .eq("whop_membership_id", params.whopMembershipId);
  } else if (params.source === "apple" && params.appleOriginalTransactionId) {
    query = admin
      .from("users")
      .update(patch)
      .eq("apple_original_transaction_id", params.appleOriginalTransactionId);
  } else {
    throw new Error("clearEntitlement: cannot identify user");
  }

  const { error } = await query;
  if (error) throw new Error(`clearEntitlement: ${error.message}`);
}
