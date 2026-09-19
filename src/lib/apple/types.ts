// Apple App Store Server Notifications V2 + StoreKit2 transaction shapes — only
// the fields BLOCK27 reads. Apple sends far more; we decode defensively and treat
// everything as optional, because the signature (verified before we ever look at
// these) is what makes the values trustworthy, not their presence.

// The decoded JWSTransactionDecodedPayload — the inner signed transaction, shared
// by the notification's signedTransactionInfo and the StoreKit2 jwsRepresentation
// the app posts after a purchase.
export type AppleTransaction = {
  transactionId?: string;
  originalTransactionId?: string;
  productId?: string;
  bundleId?: string;
  // The UUID the app set at purchase time (StoreKit `appAccountToken`). We set it
  // to the user's Supabase id, so it is how a transaction links back to a user.
  appAccountToken?: string;
  // Epoch MILLISECONDS. expiresDate is absent for non-subscription products.
  purchaseDate?: number;
  expiresDate?: number;
  // "Auto-Renewable Subscription", etc. Informational.
  type?: string;
  // "Sandbox" | "Production".
  environment?: string;
};

// The decoded responseBodyV2DecodedPayload — the outer notification.
export type AppleNotification = {
  notificationType?: string;
  subtype?: string;
  notificationUUID?: string;
  version?: string;
  signedDate?: number;
  data?: {
    appAppleId?: number;
    bundleId?: string;
    bundleVersion?: string;
    environment?: string;
    // Inner JWS strings — verified separately.
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
  };
};

// What a notification means for a user's entitlement.
export type EntitlementAction = "grant" | "revoke" | "ignore";
