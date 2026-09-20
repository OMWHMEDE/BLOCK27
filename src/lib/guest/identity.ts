// Guest identity constants, shared by the server cookie helpers and the edge
// proxy. Plain module — no next/headers, no server-only — so it is safe to
// import from both the Node route handlers and the proxy/middleware runtime.

export const GUEST_COOKIE = "b27_guest";
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24; // 24h — matches the data TTL.

// The native app can't send our httpOnly cookie, so it generates and stores its
// own guest id and sends it in this header instead. Same opaque-UUID trust model
// as the cookie (the worst a forged value reaches is an empty guest bucket; the
// IP rate limit is the real guard).
export const GUEST_HEADER = "x-guest-id";

const GUEST_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isGuestId(v: string | undefined | null): v is string {
  return typeof v === "string" && GUEST_ID.test(v);
}

// Read a valid guest id from request headers, or null. Lowercased so an
// uppercase UUID from a client still matches. Safe to import anywhere — no
// next/headers, no server-only.
export function guestIdFromHeaders(headers: Headers): string | null {
  const v = headers.get(GUEST_HEADER)?.toLowerCase() ?? null;
  return isGuestId(v) ? v : null;
}
