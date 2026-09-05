import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { tierForWhopPlan } from "@/lib/whop/plans";

// Whop payment webhook. Verified per Whop's own "Verify without an SDK" docs,
// which are a deliberate deviation from vanilla Standard Webhooks:
//   signed string : `${webhook-id}.${webhook-timestamp}.${rawBody}`
//   algorithm     : HMAC-SHA256
//   KEY           : the raw `ws_...` secret STRING — NOT stripped, NOT base64-decoded
//   signature     : base64, delivered in `webhook-signature` as `v1,<base64>`
//                   (possibly a space-separated list of `v1,<sig>` entries)
//   replay guard  : reject webhook-timestamp more than 5 minutes from now
// The standardwebhooks library base64-decodes the secret, so it threw
// "Base64Coder: incorrect characters" on the `ws_` prefix before ever checking a
// signature — which is what kept 401'ing every real delivery.
export const runtime = "nodejs";

const TOLERANCE_SECONDS = 300;

type VerifyResult = "ok" | "missing_headers" | "stale" | "mismatch";

// Verify over the RAW body — never a parsed/re-serialized copy, which would
// change the bytes and break the HMAC.
function verifyWhopSignature(
  rawBody: string,
  id: string,
  timestamp: string,
  signatureHeader: string,
  secret: string,
): VerifyResult {
  if (!id || !timestamp || !signatureHeader) return "missing_headers";

  const ts = Number.parseInt(timestamp, 10);
  if (Number.isNaN(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > TOLERANCE_SECONDS) {
    return "stale";
  }

  const expected = crypto
    .createHmac("sha256", secret) // key = the raw `ws_...` string, per Whop's docs
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  // webhook-signature may carry multiple space-separated `v1,<base64>` entries.
  for (const part of signatureHeader.split(" ")) {
    const comma = part.indexOf(",");
    const sig = comma >= 0 ? part.slice(comma + 1) : part;
    const sigBuf = Buffer.from(sig);
    if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return "ok";
    }
  }
  return "mismatch";
}

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

// Whop's dashboard "Test" button sends an unsigned request with an empty data
// object. We acknowledge that probe with 200 (no side effects) but NEVER process
// it as a real event. A real delivery always carries the webhook-signature header.
function isEmptyDashboardProbe(rawBody: string): boolean {
  try {
    const body = JSON.parse(rawBody) as WebhookEvent;
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

  // Read the raw body ONCE — the signature is an HMAC over these exact bytes.
  const rawBody = await request.text();
  const id = request.headers.get("webhook-id") ?? "";
  const timestamp = request.headers.get("webhook-timestamp") ?? "";
  const signatureHeader = request.headers.get("webhook-signature") ?? "";

  // Fail-closed. The only unsigned request accepted is Whop's empty dashboard
  // test probe, and it exits before any database writes.
  if (!signatureHeader && isEmptyDashboardProbe(rawBody)) {
    console.info("[whop] acknowledged unsigned dashboard test probe (no side effects)");
    return NextResponse.json({ ok: true, test: true, processed: false });
  }

  const verdict = verifyWhopSignature(rawBody, id, timestamp, signatureHeader, secret);
  if (verdict !== "ok") {
    // Distinct reason (missing_headers / stale / mismatch) so any future failure
    // is unambiguous in the Vercel logs.
    console.error("[whop] webhook signature rejected:", verdict);
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "bad body" }, { status: 400 });
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
