import * as Sentry from "@sentry/nextjs";
import { scrubEvent, scrubBreadcrumb } from "./src/lib/sentry/scrub";

// Edge runtime: the request interceptor (src/proxy.ts) and any edge route run
// here. Same strict, no-PII, errors-only configuration as the server.
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
