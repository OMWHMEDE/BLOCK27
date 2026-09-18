import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { setEntitlement, clearEntitlement } from "@/lib/entitlement";
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
type Ref = { id?: string | null } | null | undefined;

// Whop's v1 payloads nest the plan and membership as objects (data.plan.id,
// data.membership.id) and the older v5 shape used flat data.plan_id /
// data.membership_id — read both so we're robust to either.
type PaymentData = {
  id?: string;
  status?: string;
  plan?: Ref;
  plan_id?: string | null;
  membership?: Ref;
  membership_id?: string | null;
  metadata?: Meta;
};
type MembershipData = {
  id?: string;
  plan?: Ref;
  plan_id?: string | null;
  metadata?: Meta;
};
type RefundOrDisputeData = { id?: string; payment?: PaymentData };
// The v1 envelope names the event `type`; the legacy v5 shape used `action`.
type WebhookEvent = { type?: string; action?: string; data?: unknown };

function uidFrom(meta: Meta): string | null {
  const v = meta?.["supabase_user_id"];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function planIdFrom(d: { plan?: Ref; plan_id?: string | null }): string | null {
  return d.plan?.id ?? d.plan_id ?? null;
}

function membershipIdFrom(d: {
  membership?: Ref;
  membership_id?: string | null;
}): string | null {
  return d.membership?.id ?? d.membership_id ?? null;
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

  // v1 names the event `type`; the old v5 shape used `action`. Read both.
  const kind = event.type ?? event.action ?? "";
  console.log("[whop] event", kind);

  try {
    switch (kind) {
      case "payment.succeeded": {
        const d = event.data as PaymentData;
        await grant(
          {
            userId: uidFrom(d.metadata),
            planId: planIdFrom(d),
            membershipId: membershipIdFrom(d),
          },
          d.id,
        );
        break;
      }

      // Grant on activation. v1 = membership.activated; keep the v5 name as an
      // alias so a mixed/pinned endpoint still works.
      case "membership.activated":
      case "membership.went_valid": {
        const d = event.data as MembershipData;
        await grant(
          {
            userId: uidFrom(d.metadata),
            planId: planIdFrom(d),
            membershipId: d.id ?? null,
          },
          d.id,
        );
        break;
      }

      // Revoke on deactivation. v1 = membership.deactivated; v5 alias kept.
      case "membership.deactivated":
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
          { userId: uidFrom(p.metadata), membershipId: membershipIdFrom(p) },
          d.id ?? p.id,
        );
        break;
      }

      case "payment.failed":
        console.warn("[whop] payment.failed", (event.data as PaymentData).id);
        break;

      default:
        console.info("[whop] unhandled event", kind);
        break;
    }
  } catch (err) {
    console.error("[whop] handler error for", kind, err);
    return NextResponse.json({ ok: false, error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function grant(ident: Grant, logId?: string) {
  const tier = tierForWhopPlan(ident.planId);
  // One line, every grant: what we resolved from the payload and what we mapped.
  console.log(
    `[whop] grant resolve: user=${ident.userId} plan=${ident.planId} tier=${tier} (payment ${logId})`,
  );
  if (!ident.userId) {
    console.error(
      "[whop] grant: no supabase_user_id in metadata — cannot link payment",
      logId,
    );
    return;
  }
  if (!tier) {
    console.error(
      "[whop] grant: plan_id did not map to a tier — check NEXT_PUBLIC_WHOP_PLAN_* in prod",
      ident.planId,
    );
    return;
  }

  const updated = await setEntitlement({
    userId: ident.userId,
    tier,
    ref: { source: "whop", whopMembershipId: ident.membershipId },
  });
  console.log(
    `[whop] grant update: tier=${tier} user=${ident.userId} rowsUpdated=${updated}`,
  );
  if (updated === 0) {
    // Loud: a valid, signed, mapped event that matched NO row — the id in the
    // metadata has no users row. Never silently 200 past this.
    console.error(
      "[whop] grant: 0 rows updated — no public.users row with id",
      ident.userId,
    );
    return;
  }

  console.log("[whop] granted", tier, "to user", ident.userId);
}

async function revoke(ident: Revoke, logId?: string) {
  if (!ident.userId && !ident.membershipId) {
    console.error("[whop] revoke: cannot identify user", logId);
    return;
  }

  await clearEntitlement({
    source: "whop",
    userId: ident.userId,
    whopMembershipId: ident.membershipId,
  });

  console.log(
    "[whop] revoked to free",
    ident.userId ?? `membership ${ident.membershipId}`,
  );
}
