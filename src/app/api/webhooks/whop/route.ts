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

// The Whop user id and plan id in the payload are WHOP's, not ours. We link a
// payment to a BLOCK27 account via metadata.supabase_user_id, which the checkout
// session must set (see the activation notes / the checkout-session route).
type WhopWebhookData = {
  id?: string;
  plan_id?: string | null;
  membership_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

function ourUserId(data: WhopWebhookData): string | null {
  const v = data.metadata?.["supabase_user_id"];
  return typeof v === "string" && v.length > 0 ? v : null;
}

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
      case "payment.succeeded":
      case "membership.went_valid":
        await grant(event.data as WhopWebhookData);
        break;

      // Access ended: subscription expired or was cancelled → back to free.
      case "membership.went_invalid":
        await revoke(event.data as WhopWebhookData);
        break;

      // Failed payment: keep the user on their current tier. Nothing to write;
      // the failure is surfaced to the user in the checkout UI, not here.
      case "payment.failed":
        console.warn("[whop] payment.failed", (event.data as WhopWebhookData).id);
        break;

      default:
        // pending / refunds / disputes / affiliate events — not acted on here.
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
async function grant(data: WhopWebhookData) {
  const userId = ourUserId(data);
  const tier = tierForWhopPlan(data.plan_id);
  if (!userId) {
    console.error(
      "[whop] grant: no supabase_user_id in metadata — cannot link payment",
      data.id,
    );
    return;
  }
  if (!tier) {
    console.error("[whop] grant: unknown plan_id, no tier mapped", data.plan_id);
    return;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      plan_tier: tier,
      subscription_status: "active",
      whop_membership_id: data.membership_id ?? null,
    })
    .eq("id", userId);
  if (error) throw new Error(`grant update failed: ${error.message}`);
  console.log("[whop] granted", tier, "to user", userId);
}

// Return the user to free. Prefer the metadata link; fall back to the stored
// membership id so a cancellation still finds the account.
async function revoke(data: WhopWebhookData) {
  const admin = createAdminClient();
  const patch = { plan_tier: "free", subscription_status: "none" };

  const userId = ourUserId(data);
  const query = userId
    ? admin.from("users").update(patch).eq("id", userId)
    : data.membership_id
      ? admin.from("users").update(patch).eq("whop_membership_id", data.membership_id)
      : null;

  if (!query) {
    console.error("[whop] revoke: cannot identify user", data.id);
    return;
  }
  const { error } = await query;
  if (error) throw new Error(`revoke update failed: ${error.message}`);
  console.log("[whop] revoked to free", userId ?? `membership ${data.membership_id}`);
}
