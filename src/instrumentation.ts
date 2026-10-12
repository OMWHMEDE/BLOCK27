import * as Sentry from "@sentry/nextjs";

// Next loads this once per server runtime. Pull in the matching Sentry init so
// both the Node routes/workers and the edge interceptor are instrumented.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Capture errors thrown out of server components and route handlers. Routes that
// catch their own errors (the job workers, analysis, webhooks) report explicitly
// via captureServerError; this covers anything that throws uncaught.
export const onRequestError = Sentry.captureRequestError;
