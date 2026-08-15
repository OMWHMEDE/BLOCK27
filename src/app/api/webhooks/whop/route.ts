import { NextResponse } from "next/server";
import { makeWebhookValidator } from "@whop/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { tierForWhopPlan } from "@/lib/whop/plans";

// The Whop payment webhook — the ONLY thing that changes a user's paid tier.
// Whop signs every request; makeWebhookValidator verifies the signature against
// WHOP_WEBHOOK_SECRET (from the Whop dashboard → Developer → Webhooks) and
// throws on a bad/missing signature, so an unsigned POST can never grant access.
//
// It runs with no user session, so it uses the service-role admin client. It is
// fail-closed and idempotent: it grants a tier only when it can (a) verify the
// signature, (b) map the Whop plan id to one of our tiers, AND (c) identify our
// user from the checkout metadata. If any is missing it logs and changes nothing.
export const runtime = "nodejs";

// The Whop ids in the payload are WHOP's, not ours. We link a payment to a
// BLOCK27 account via metadata.supabase_user_id, which the checkout session sets
// (see the activation notes / the checkout-session route). Both PaymentWebhookData
// and MembershipWebhookData carry metadata; refund/dispute payloads nest the full
// payment under `.payment`.
type Meta = Record<string, unknown> | null | undefined;
type PaymentData = {
  id?: string;
  plan_id?: string | null;
  membership_id?: string | null;
  metadata?: Meta;
};
type MembershipData = { id?: string; plan_id?: string | null; metadata?: Meta };
type RefundOrDisputeData = { id?: string; payment?: PaymentData };

// Our user id from a payload's metadata, or null.
function uidFrom(meta: Meta): string | null {
  const v = meta?.["supabase_user_id"];
  return typeof v === "string" && v.length > 0 ? v : null;
}

type Grant = { userId: string | null; planId: string | null; membershipId: string | null };
type Revoke = { userId: string | null; membershipId: string | null };

export async function POST(request: Request) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    // Never accept an unverifiable webhook. 503 so Whop retries once configured.
    console.error("[whop] WHOP_WEBHOOK_SECRET not set — refusing webhook");
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });
  }

  // Validate the signature. Constructed per-request so a missing secret can never
  // throw at module load. A bad signature throws → 401, and nothing is written.
  let event: Awaited<ReturnType<ReturnType<typeof makeWebhookValidator>>>;
  try {
    event = await makeWebhookValidator({ webhookSecret: secret })(request);
  } catch (err) {
    console.error(
      "[whop] webhook signature invalid:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
  }

  try {
    switch (event.action) {
      // Access granted: a payment cleared, or a membership became valid. Both
      // are safe to treat as "grant the purchased tier" — the handler is
      // idempotent, so receiving both for one purchase is fine.
      case "payment.succeeded": {
        const d = event.data as PaymentData;
        await grant({
          userId: uidFrom(d.metadata),
          planId: d.plan_id ?? null,
          membershipId: d.membership_id ?? null,
        }, d.id);
        break;
      }
      case "membership.went_valid": {
        const d = event.data as MembershipData;
        // A membership payload's own id IS the membership id (no membership_id).
        await grant({
          userId: uidFrom(d.metadata),
          planId: d.plan_id ?? null,
          membershipId: d.id ?? null,
        }, d.id);
        break;
      }

      // Access ended: subscription expired or was cancelled → back to free.
      case "membership.went_invalid": {
        const d = event.data as MembershipData;
        await revoke({ userId: uidFrom(d.metadata), membershipId: d.id ?? null }, d.id);
        break;
      }

      // Money reversed: a refund was issued or a chargeback opened. Downgrade and
      // lock immediately — the same effect as a cancellation — so a refunder
      // can't keep using paid access. revoke() is idempotent, so overlap with a
      // later went_invalid for the same membership is harmless. (This can't claw
      // back already-spent render cost; the per-cycle try-on cap bounds that.)
      case "refund.created":
      case "dispute.created": {
        const d = event.data as RefundOrDisputeData;
        const p = d.payment ?? {};
        await revoke(
          { userId: uidFrom(p.metadata), membershipId: p.membership_id ?? null },
          d.id ?? p.id,
        );
        break;
      }

      // Failed payment: keep the user on their current tier. Nothing to write;
      // the failure is surfaced to the user in the checkout UI, not here.
      case "payment.failed":
        console.warn("[whop] payment.failed", (event.data as PaymentData).id);
        break;

      default:
        // pending / refund.updated / dispute.updated / affiliate events — not
        // acted on here (we act on refund.created / dispute.created only).
        break;
    }
  } catch (err) {
    // A transient DB failure must not silently drop a grant — 500 so Whop
    // retries the delivery.
    console.error("[whop] handler error for", event.action, err);
    return NextResponse.json({ ok: false, error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Move the user to the purchased tier. subscription_status is also set to
// 'active' so the EXISTING paid gate (which unlocks the hand) works immediately;
// plan_tier records which of the four tiers they bought for per-tier limits.
async function grant(ident: Grant, logId?: string) {
  const tier = tierForWhopPlan(ident.planId);
  if (!ident.userId) {
    console.error(
      "[whop] grant: no supabase_user_id in metadata — cannot link payment",
      logId,
    );
    return;
  }
  if (!tier) {
    console.error("[whop] grant: unknown plan_id, no tier mapped", ident.planId);
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      plan_tier: tier,
      subscription_status: "active",
      whop_membership_id: ident.membershipId,
    })
    .eq("id", ident.userId);
  if (error) throw new Error(`grant update failed: ${error.message}`);

  // Anchor the usage window to the FIRST grant only (set-if-null), so the
  // monthly allowance rolls on the purchase anniversary and a mid-cycle
  // payment.succeeded can't hand out a fresh allowance. Best-effort: if the
  // column isn't there yet (pre-migration), the window falls back to created_at.
  const { error: anchorErr } = await admin
    .from("users")
    .update({ plan_anchor_at: new Date().toISOString() })
    .eq("id", ident.userId)
    .is("plan_anchor_at", null);
  if (anchorErr) console.error("[whop] grant: anchor set failed", anchorErr.message);

  console.log("[whop] granted", tier, "to user", ident.userId);
}

// Return the user to free. Prefer the metadata link; fall back to the stored
// membership id so a cancellation/refund still finds the account. Clears the
// usage anchor so a later re-subscribe re-anchors to its own purchase date.
async function revoke(ident: Revoke, logId?: string) {
  const admin = createAdminClient();
  const patch = {
    plan_tier: "free",
    subscription_status: "none",
    plan_anchor_at: null,
  };

  const query = ident.userId
    ? admin.from("users").update(patch).eq("id", ident.userId)
    : ident.membershipId
      ? admin.from("users").update(patch).eq("whop_membership_id", ident.membershipId)
      : null;

  if (!query) {
    console.error("[whop] revoke: cannot identify user", logId);
    return;
  }
  const { error } = await query;
  if (error) throw new Error(`revoke update failed: ${error.message}`);
  console.log(
    "[whop] revoked to free",
    ident.userId ?? `membership ${ident.membershipId}`,
  );
}
