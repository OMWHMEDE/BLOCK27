import { NextResponse } from "next/server";
import { makeWebhookValidator } from "@whop/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { tierForWhopPlan } from "@/lib/whop/plans";

// Whop payment webhook. Real deliveries MUST be signed. The Whop dashboard's
// built-in "Test webhook" currently sends no Standard Webhooks signature headers;
// we acknowledge only its empty-data probe and never process it as a real event.
export const runtime = "nodejs";

type Meta = Record<string, unknown> | null | undefined;
type PaymentData = {
  id?: string;
  plan_id?: string | null;
  membership_id?: string | null;
  metadata?: Meta;
};
type MembershipData = { id?: string; plan_id?: string | null; metadata?: Meta };
type RefundOrDisputeData = { id?: string; payment?: PaymentData };
type WebhookEvent = { action?: string; data?: unknown };

function uidFrom(meta: Meta): string | null {
  const v = meta?.["supabase_user_id"];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function isEmptyObject(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length === 0
  );
}

// Whop's dashboard tester has a known behavior where it omits webhook-id,
// webhook-timestamp and webhook-signature and sends an empty data object. We may
// return 200 for that diagnostic probe, but we NEVER run grant/revoke for it.
async function isUnsignedDashboardProbe(request: Request): Promise<boolean> {
  if (
    request.headers.get("webhook-signature") ||
    request.headers.get("webhook-id") ||
    request.headers.get("webhook-timestamp")
  ) {
    return false;
  }

  try {
    const body = (await request.clone().json()) as WebhookEvent;
    return typeof body?.action === "string" && isEmptyObject(body.data);
  } catch {
    return false;
  }
}

type Grant = {
  userId: string | null;
  planId: string | null;
  membershipId: string | null;
};
type Revoke = { userId: string | null; membershipId: string | null };

export async function POST(request: Request) {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[whop] WHOP_WEBHOOK_SECRET not set — refusing webhook");
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });
  }

  // Keep production security fail-closed. The only unsigned request accepted is
  // Whop's empty dashboard test probe, and it exits before any database writes.
  if (await isUnsignedDashboardProbe(request)) {
    console.info("[whop] acknowledged unsigned dashboard test probe (no side effects)");
    return NextResponse.json({ ok: true, test: true, processed: false });
  }

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
      case "payment.succeeded": {
        const d = event.data as PaymentData;
        await grant(
          {
            userId: uidFrom(d.metadata),
            planId: d.plan_id ?? null,
            membershipId: d.membership_id ?? null,
          },
          d.id,
        );
        break;
      }

      case "membership.went_valid": {
        const d = event.data as MembershipData;
        await grant(
          {
            userId: uidFrom(d.metadata),
            planId: d.plan_id ?? null,
            membershipId: d.id ?? null,
          },
          d.id,
        );
        break;
      }

      case "membership.went_invalid": {
        const d = event.data as MembershipData;
        await revoke(
          { userId: uidFrom(d.metadata), membershipId: d.id ?? null },
          d.id,
        );
        break;
      }

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

      case "payment.failed":
        console.warn("[whop] payment.failed", (event.data as PaymentData).id);
        break;

      default:
        break;
    }
  } catch (err) {
    console.error("[whop] handler error for", event.action, err);
    return NextResponse.json({ ok: false, error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

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

  const { error: anchorErr } = await admin
    .from("users")
    .update({ plan_anchor_at: new Date().toISOString() })
    .eq("id", ident.userId)
    .is("plan_anchor_at", null);
  if (anchorErr) {
    console.error("[whop] grant: anchor set failed", anchorErr.message);
  }

  console.log("[whop] granted", tier, "to user", ident.userId);
}

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
      ? admin
          .from("users")
          .update(patch)
          .eq("whop_membership_id", ident.membershipId)
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
