// Guest identity constants, shared by the server cookie helpers and the edge
// proxy. Plain module — no next/headers, no server-only — so it is safe to
// import from both the Node route handlers and the proxy/middleware runtime.

export const GUEST_COOKIE = "b27_guest";
export const GUEST_COOKIE_MAX_AGE = 60 * 60 * 24; // 24h — matches the data TTL.

const GUEST_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isGuestId(v: string | undefined | null): v is string {
  return typeof v === "string" && GUEST_ID.test(v);
}
