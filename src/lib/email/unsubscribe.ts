import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Signed unsubscribe tokens for waitlist email.
//
// The link in a confirmation email carries the recipient's address and a token.
// The token is an HMAC of the address, so a recipient can only unsubscribe
// their own address and the link can't be tampered to unsubscribe someone
// else's. We key the HMAC with SUPABASE_SERVICE_ROLE_KEY — already a
// server-only secret — so this adds no new env var and the token is useless to
// anyone without it. No token is stored; it is recomputed and compared on use.
//
// Keeping this separate from the Resend client means the unsubscribe page can
// verify a token without pulling the email SDK into its bundle.

const SITE_URL = "https://www.block27.app";

function key(): string {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  return k;
}

export function unsubscribeToken(email: string): string {
  return createHmac("sha256", key())
    .update(email.trim().toLowerCase())
    .digest("base64url");
}

export function verifyUnsubscribe(email: string, token: string): boolean {
  if (!email || !token) return false;
  const expected = unsubscribeToken(email);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  // Length check first: timingSafeEqual throws on a length mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}

// The absolute link placed in the email body and the List-Unsubscribe header.
export function unsubscribeUrl(email: string): string {
  const clean = email.trim().toLowerCase();
  const q = new URLSearchParams({ e: clean, t: unsubscribeToken(clean) });
  return `${SITE_URL}/waitlist/unsubscribe?${q.toString()}`;
}
