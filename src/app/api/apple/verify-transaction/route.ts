import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/server";
import { verifyAppleJws } from "@/lib/apple/jws";
import { appleBundleId, tierForAppleProduct } from "@/lib/apple/products";
import type { AppleTransaction } from "@/lib/apple/types";
import { setEntitlement } from "@/lib/entitlement";
import { paymentsOpen } from "@/lib/payments";

// StoreKit2 immediate grant. After a purchase the app posts the transaction's
// jwsRepresentation here so access unlocks now instead of waiting for the async
// App Store Server Notification. We verify the JWS, confirm it belongs to THIS
// signed-in user (appAccountToken == their id) and is current, map the product to
// a tier, and grant through the shared entitlement writer. The notification
// webhook remains the source of truth for renewals and revokes.
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const { user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Server backstop for the payments switch — mirror of whop/checkout-session.
  if (!paymentsOpen()) {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    signedTransaction?: unknown;
  };
  const result = verifyAppleJws<AppleTransaction>(body.signedTransaction);
  if (!result.ok) {
    console.error("[apple] verify-transaction rejected:", result.reason);
    return NextResponse.json({ ok: false, error: "invalid transaction" }, { status: 400 });
  }
  const tx = result.payload;

  // Reject a transaction for another app.
  const expectedBundle = appleBundleId();
  if (expectedBundle && tx.bundleId && tx.bundleId !== expectedBundle) {
    return NextResponse.json({ ok: false, error: "invalid transaction" }, { status: 400 });
  }

  // The transaction MUST belong to the caller. appAccountToken is the UUID the
  // app set to the user's id at purchase; without this check a user could replay
  // someone else's signed transaction to grant themselves a tier.
  if ((tx.appAccountToken ?? "").toLowerCase() !== user.id.toLowerCase()) {
    return NextResponse.json(
      { ok: false, error: "transaction not for this account" },
      { status: 403 },
    );
  }

  // A subscription that has already lapsed grants nothing — let the webhook's
  // revoke stand rather than re-granting an expired transaction.
  if (typeof tx.expiresDate === "number" && tx.expiresDate <= Date.now()) {
    return NextResponse.json({ ok: false, error: "transaction expired" }, { status: 409 });
  }

  const tier = tierForAppleProduct(tx.productId);
  if (!tier) {
    console.error("[apple] verify-transaction: unmapped product", tx.productId);
    return NextResponse.json({ ok: false, error: "unknown product" }, { status: 400 });
  }

  const updated = await setEntitlement({
    userId: user.id,
    tier,
    ref: {
      source: "apple",
      appleOriginalTransactionId: tx.originalTransactionId ?? null,
      appleProductId: tx.productId ?? null,
    },
  });
  console.log(
    `[apple] verify-transaction grant: tier=${tier} user=${user.id} rowsUpdated=${updated}`,
  );

  return NextResponse.json({ ok: true, tier });
}
