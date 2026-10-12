import type { NextConfig } from "next";
// v11 exports the build wrapper from the /config subpath.
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Quiet build output; no Sentry build telemetry.
  silent: true,
  telemetry: false,
  // Source maps are NOT uploaded — no auth token is configured — so production
  // stack traces are minified but errors are still captured. To get readable
  // traces later, set SENTRY_ORG, SENTRY_PROJECT and SENTRY_AUTH_TOKEN in the
  // environment and remove this disable.
  sourcemaps: { disable: true },
});
