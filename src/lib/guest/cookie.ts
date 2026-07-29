import "server-only";
import { cookies } from "next/headers";
import {
  GUEST_COOKIE,
  GUEST_COOKIE_MAX_AGE,
  isGuestId,
} from "@/lib/guest/identity";

// The guest identity. A visitor with no account is keyed by a random UUID held
// in an httpOnly cookie — not readable by client JS, sent only to our server.
// It is an opaque, unguessable id, so it needs no signing: the worst a forged
// value can reach is an empty guest bucket. It expires with the data TTL.
//
// The cookie is normally minted by the proxy on arrival (see the guest block in
// lib/supabase/middleware), so by the time a guest uploads, the id already
// exists and is stable. These helpers read it; ensureGuestId keeps a create
// fallback for any path the proxy didn't cover.

// Read the guest id, or null. Does NOT create one — use in GET/read paths.
export async function readGuestId(): Promise<string | null> {
  const store = await cookies();
  const v = store.get(GUEST_COOKIE)?.value;
  return isGuestId(v) ? v : null;
}

// Read the guest id, creating and setting the cookie when absent. A fallback for
// the rare path the proxy didn't mint on first.
export async function ensureGuestId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(GUEST_COOKIE)?.value;
  if (isGuestId(existing)) return existing;

  const id = crypto.randomUUID();
  store.set(GUEST_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE,
  });
  return id;
}

// Drop the cookie once a guest converts — their data has moved to the account.
export async function clearGuestId(): Promise<void> {
  const store = await cookies();
  store.delete(GUEST_COOKIE);
}
