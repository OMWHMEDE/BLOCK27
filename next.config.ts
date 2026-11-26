import type { NextConfig } from "next";
// v11 exports the build wrapper from the /config subpath.
import { withSentryConfig } from "@sentry/nextjs/config";

const securityHeaders = [
  // Nobody can put block27.app inside their own page (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // Browsers take files for what we say they are.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Other sites see where a visitor came from, never the full address.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HTTPS only, for two years.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // The website never needs these.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
