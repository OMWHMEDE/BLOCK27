// Waitlist attribution — one source of truth for the marketing-channel capture.
//
// The query parameter is `src` (e.g. block27.app/?src=tiktok,
// block27.app/waitlist?src=ig-bio). `utm_source` is accepted as a fallback so
// links that already carry the standard UTM tag still attribute correctly. When
// neither is present the signup is recorded as `direct`.
//
// Pure string logic, no server imports, so the landing (client) and the
// waitlist page (server) can both normalize the same way.

export const SOURCE_PARAM = "src";
const FALLBACK_PARAM = "utm_source";
const DEFAULT_SOURCE = "direct";
const MAX_LEN = 64;

// A query value arrives as string | string[] | null | undefined (Next's
// searchParams) or a raw string (URLSearchParams.get). Take the first value,
// lowercase it, and keep only a safe slug charset so an arbitrary query string
// can never write junk or control characters into the column. Empty or missing
// collapses to 'direct'.
function clean(raw: string | string[] | null | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, MAX_LEN);
  return slug.length > 0 ? slug : null;
}

// From Next's searchParams object (server: landing/waitlist pages).
export function sourceFromParams(
  params: Record<string, string | string[] | undefined>,
): string {
  return clean(params[SOURCE_PARAM]) ?? clean(params[FALLBACK_PARAM]) ?? DEFAULT_SOURCE;
}

// From a raw URL query string (client: NotifyLaunch reads window.location).
export function sourceFromSearch(search: string): string {
  const q = new URLSearchParams(search);
  return clean(q.get(SOURCE_PARAM)) ?? clean(q.get(FALLBACK_PARAM)) ?? DEFAULT_SOURCE;
}

// Final guard applied server-side before the insert, whatever the caller sent.
export function normalizeSource(raw: string | null | undefined): string {
  return clean(raw) ?? DEFAULT_SOURCE;
}
