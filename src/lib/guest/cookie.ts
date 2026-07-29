import "server-only";
import { cookies } from "next/headers";

// The guest identity. A visitor with no account is keyed by a random UUID held
// in an httpOnly cookie — not readable by client JS, sent only to our server.
// It is an opaque, unguessable id, so it needs no signing: the worst a forged
// value can reach is an empty guest bucket. It expires with the data TTL.

const COOKIE = "b27_guest";
const MAX_AGE = 60 * 60 * 24; // 24h — matches the guest data TTL.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Read the guest id, or null. Does NOT create one — use in GET/read paths.
export async function readGuestId(): Promise<string | null> {
  const store = await cookies();
  const v = store.get(COOKIE)?.value;
  return v && UUID.test(v) ? v : null;
}

// Read the guest id, creating and setting the cookie when absent. Use in the
// POST paths that start a guest's session (the first upload).
export async function ensureGuestId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value;
  if (existing && UUID.test(existing)) return existing;

  const id = crypto.randomUUID();
  store.set(COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return id;
}

// Drop the cookie once a guest converts — their data has moved to the account.
export async function clearGuestId(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
