import "server-only";
import { Resend } from "resend";

// Lazy Resend client. RESEND_API_KEY lives in the backend only (no NEXT_PUBLIC_
// prefix, server-only import) so it never reaches the browser bundle. When the
// key is absent — local dev, preview, a misconfigured deploy — this returns
// null and callers treat email as a no-op rather than throwing. Email is never
// allowed to break the operation it accompanies.

let client: Resend | null = null;

export function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

// The verified block27.app sender and the reply-to. From must be on a domain
// verified in Resend (block27.app) or the send is rejected.
export const EMAIL_FROM = "BLOCK27 <launch@block27.app>";
