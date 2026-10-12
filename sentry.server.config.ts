import * as Sentry from "@sentry/nextjs";
import { scrubEvent, scrubBreadcrumb } from "./src/lib/sentry/scrub";

// Server (Node) runtime: the API routes, the background job workers and the
// payment webhooks. This is the main value of the integration. The DSN lives in
// an env var; with it unset the SDK initialises to a no-op, so local/dev and any
// build without the var simply don't send.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // No PII. @sentry/nextjs v11 removed the `sendDefaultPii` flag, so the hard
    // guarantee is `beforeSend` (scrubEvent): it strips request bodies, cookies,
    // headers, IPs, emails and signed-URL tokens, and reduces the user to an id.
    // No Session Replay integration is added either (it would record the screen).
    // Errors only — no performance tracing (less data, less PII surface, lower
    // cost). Flip this up later if you want transactions.
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}
