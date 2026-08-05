import type { MetadataRoute } from "next";

// A real 200 robots.txt — Next was returning 404 for /robots.txt, and while a
// missing file means "allow all", some crawlers and payment-processor verifiers
// fetch robots.txt first and treat a clean allow-all + sitemap as a health
// signal. Permissive: everything public is crawlable; only the internal API is
// disallowed. The proxy is configured to skip /robots.txt so this serves raw.
//
// Canonical host is www (the apex 308-redirects to it), so links point at www.
const SITE = "https://www.block27.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
