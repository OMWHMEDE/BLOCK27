import { NextResponse } from "next/server";
import { verifyAppleJws } from "@/lib/apple/jws";
import {
  appleBundleId,
  classifyNotification,
  tierForAppleProduct,
} from "@/lib/apple/products";
import type { AppleNotification, AppleTransaction } from "@/lib/apple/types";
import { setEntitlement, clearEntitlement } from "@/lib/entitlement";
import { paymentsOpen } from "@/lib/payments";

// App Store Server Notifications V2. Apple POSTs { signedPayload: <JWS> }. We
// verify the outer notification JWS and the inner signedTransactionInfo JWS
// (cert chain -> pinned Apple root, ES256), map the product to a tier and the
// appAccountToken to our user, and grant/revoke through the shared entitlement
// writer — the same seam the Whop webhook uses, so the two never clobber each
// other. Identity comes only from the SIGNED transaction, never an unsigned body.
export const runtime = "nodejs";
export const maxDuration = 30;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// appAccountToken is the UUID we set at purchase time to the user's Supabase id.
function userIdFrom(token: string | undefined): string | null {
  return token && UUID_RE.test(token) ? token.toLowerCase() : null;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    signedPayload?: unknown;
  } | null;
  if (!body || typeof body.signedPayload !== "string") {
    return NextResponse.json({ ok: false, error: "no signedPayload" }, { status: 400 });
  }

  // 1. Verify the outer notification.
  const outer = verifyAppleJws<AppleNotification>(body.signedPayload);
  if (!outer.ok) {
    console.error("[apple] notification signature rejected:", outer.reason);
    return NextResponse.json({ ok: false, error: "bad signature" }, { status: 401 });
  }
  const note = outer.payload;

  // Reject notifications for another app.
  const expectedBundle = appleBundleId();
  if (expectedBundle && note.data?.bundleId && note.data.bundleId !== expectedBundle) {
    console.warn("[apple] notification for unexpected bundle", note.data.bundleId);
    return NextResponse.json({ ok: true, ignored: "bundle" });
  }

  // 2. Verify the inner signed transaction (identity + product live here).
  const txJws = note.data?.signedTransactionInfo;
  if (!txJws) {
    // Some event types carry no transaction; nothing to act on.
    console.info("[apple] notification without signedTransactionInfo", note.notificationType);
    return NextResponse.json({ ok: true, processed: false });
  }
  const inner = verifyAppleJws<AppleTransaction>(txJws);
  if (!inner.ok) {
    console.error("[apple] transaction signature rejected:", inner.reason);
    return NextResponse.json({ ok: false, error: "bad transaction" }, { status: 401 });
  }
  const tx = inner.payload;

  const action = classifyNotification(note.notificationType, note.subtype);
  const userId = userIdFrom(tx.appAccountToken);
  const originalTransactionId = tx.originalTransactionId ?? null;

  try {
    if (action === "grant") {
      // Mirror the payments backstop: if the paid path is switched off, do not
      // grant — even for a real purchase. Acknowledge so Apple stops retrying.
      if (!paymentsOpen()) {
        console.warn("[apple] grant skipped — payments closed", note.notificationType);
        return NextResponse.json({ ok: true, processed: false, reason: "payments_closed" });
      }
      const tier = tierForAppleProduct(tx.productId);
      if (!userId) {
        console.error("[apple] grant: no valid appAccountToken — cannot link", tx.transactionId);
        return NextResponse.json({ ok: true, processed: false, reason: "no_user" });
      }
      if (!tier) {
        console.error(
          "[apple] grant: product did not map to a tier — check APPLE_PRODUCT_* in prod",
          tx.productId,
        );
        return NextResponse.json({ ok: true, processed: false, reason: "no_tier" });
      }
      const updated = await setEntitlement({
        userId,
        tier,
        ref: {
          source: "apple",
          appleOriginalTransactionId: originalTransactionId,
          appleProductId: tx.productId ?? null,
        },
      });
      console.log(
        `[apple] grant: type=${note.notificationType} tier=${tier} user=${userId} rowsUpdated=${updated}`,
      );
      if (updated === 0) {
        console.error("[apple] grant: 0 rows updated — no users row with id", userId);
      }
    } else if (action === "revoke") {
      // Revokes always process (a refund/expiry must land regardless of the
      // switch). Identify by user if we can, else by the original transaction id.
      if (!userId && !originalTransactionId) {
        console.error("[apple] revoke: cannot identify user", tx.transactionId);
        return NextResponse.json({ ok: true, processed: false, reason: "no_user" });
      }
      await clearEntitlement({
        source: "apple",
        userId,
        appleOriginalTransactionId: originalTransactionId,
      });
      console.log(
        `[apple] revoke: type=${note.notificationType} user=${userId ?? `orig ${originalTransactionId}`}`,
      );
    } else {
      console.info("[apple] ignored notification", note.notificationType, note.subtype);
    }
  } catch (err) {
    // Transient failure — return 500 so Apple retries the notification.
    console.error("[apple] handler error for", note.notificationType, err);
    return NextResponse.json({ ok: false, error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
