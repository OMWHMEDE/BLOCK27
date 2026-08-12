import "server-only";
import { WhopServerSdk } from "@whop/api";

// The server-side Whop SDK, built from the server-only API key and the public
// app id. Used to create checkout sessions that carry the buyer's BLOCK27 user
// id as metadata (so the webhook can link the payment back to the account).
//
// Returns null when either env is missing, so callers degrade to "checkout not
// available yet" instead of throwing — the whole flow is inert until configured.
export function whopServer(): ReturnType<typeof WhopServerSdk> | null {
  const appApiKey = process.env.WHOP_API_KEY;
  const appId = process.env.NEXT_PUBLIC_WHOP_APP_ID;
  if (!appApiKey || !appId) return null;
  return WhopServerSdk({ appApiKey, appId });
}
