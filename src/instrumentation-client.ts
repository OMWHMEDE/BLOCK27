import * as Sentry from "@sentry/nextjs";
import { scrubEvent, scrubBreadcrumb } from "@/lib/sentry/scrub";

// Browser runtime. Same strict no-PII, errors-only config as the server.
// Deliberately NO Session Replay — it records the screen, and this app shows the
// user's own photos. The DSN is public by design (it only permits ingest), so it
// ships in the client bundle via a NEXT_PUBLIC_ env var.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // No PII — v11 has no sendDefaultPii flag; beforeSend (scrubEvent) is the gate.
    tracesSampleRate: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}

// Lets Sentry tie an error to the client-side navigation that led to it.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
