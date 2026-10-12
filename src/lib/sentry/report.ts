import "server-only";
import * as Sentry from "@sentry/nextjs";

// The one way the backend reports an error to Sentry with context. It accepts
// ONLY non-PII fields: a user id (allowed), an `area` tag, extra string tags and
// small scalar extras. Never pass a request body, an email, a signed URL or image
// bytes here — scrub.ts is the backstop, but the rule starts at the call site.
//
// Used where errors are otherwise swallowed — the background job workers, the
// garment-analysis route and the payment webhooks — so failures that are silent
// today surface in Sentry.
export function captureServerError(
  error: unknown,
  ctx: {
    area: string;
    userId?: string | null;
    tags?: Record<string, string>;
    extra?: Record<string, string | number | boolean | null | undefined>;
  },
): void {
  Sentry.captureException(error, {
    tags: { area: ctx.area, ...ctx.tags },
    user: ctx.userId ? { id: ctx.userId } : undefined,
    extra: ctx.extra,
  });
}
