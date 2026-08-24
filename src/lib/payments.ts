import "server-only";

// The master switch for the paid path. Money fails safe: unset, empty, or any
// value other than the exact string "true" reads as CLOSED, so a missing or
// fat-fingered env can never open checkout. One env var, flipped and redeployed
// — a single reversible step. (The dynamic pages read it per request; the static
// pricing page bakes it at build, so a redeploy is what makes either flip take.)
//
// Server-only on purpose: the flag is not public. Client components that need it
// (the batch-upload prompt) receive it as a prop from their server parent, so the
// value is decided once, server-side, and never shipped as a NEXT_PUBLIC env.
export function paymentsOpen(): boolean {
  return process.env.PAYMENTS_OPEN === "true";
}
