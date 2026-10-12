import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

// Privacy scrubbing for every Sentry event, on the client, server and edge. This
// backend handles user photos and emails, so the rule is strict: no request
// bodies, no image data, no signed storage URLs, no emails, no IPs — only a user
// id is allowed through. sendDefaultPii:false already stops the SDK attaching
// bodies/cookies/headers/IP by default; this is the belt-and-suspenders layer
// that also redacts anything that slipped into a message, exception, breadcrumb,
// tag, extra or context.

// Emails anywhere in a string.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z0-9]{2,}/g;
// Secret-bearing query params (Supabase signed-URL tokens, API keys, auth codes,
// S3 signatures). Redact the VALUE, keep the key so the shape is still legible.
const TOKEN_PARAM =
  /\b((?:access_token|refresh_token|token|apikey|api_key|signature|x-amz-signature|x-amz-credential|x-amz-security-token|code|jwt)=)[^&\s"'#]+/gi;

// Headers that carry identity or secrets — dropped outright.
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-guest-id",
  "x-forwarded-for",
  "x-real-ip",
  "forwarded",
  "x-api-key",
  "apikey",
]);

function redactString(input: string): string {
  // Guard against an image blob / huge payload leaking as a string.
  let out = input.length > 2048 ? `${input.slice(0, 2048)}…[truncated]` : input;
  out = out.replace(EMAIL, "[email]");
  out = out.replace(TOKEN_PARAM, "$1[redacted]");
  return out;
}

// Walk a value, redacting every string, with depth and breadth caps so a huge or
// cyclic object can never blow up the send path.
function deepRedact(value: unknown, depth = 0): unknown {
  if (value == null || depth > 6) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((v) => deepRedact(v, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = deepRedact(v, depth + 1);
  }
  return out;
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  if (breadcrumb.message) breadcrumb.message = redactString(breadcrumb.message);
  if (breadcrumb.data) {
    breadcrumb.data = deepRedact(breadcrumb.data) as Record<string, unknown>;
  }
  return breadcrumb;
}

export function scrubEvent(event: ErrorEvent): ErrorEvent {
  // User: id only. Never email, IP or username.
  if (event.user) {
    const id = event.user.id;
    event.user = id != null ? { id: String(id) } : {};
  }

  if (event.request) {
    delete event.request.data; // request body
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.headers) {
      for (const key of Object.keys(event.request.headers)) {
        if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
          delete event.request.headers[key];
        }
      }
      event.request.headers = deepRedact(event.request.headers) as Record<
        string,
        string
      >;
    }
    if (typeof event.request.url === "string") {
      event.request.url = redactString(event.request.url);
    }
  }

  if (event.message) event.message = redactString(event.message);

  for (const value of event.exception?.values ?? []) {
    if (value.value) value.value = redactString(value.value);
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  }

  if (event.extra) {
    event.extra = deepRedact(event.extra) as Record<string, unknown>;
  }
  if (event.contexts) {
    event.contexts = deepRedact(event.contexts) as typeof event.contexts;
  }
  if (event.tags) {
    for (const key of Object.keys(event.tags)) {
      const v = event.tags[key];
      if (typeof v === "string") event.tags[key] = redactString(v);
    }
  }

  return event;
}
