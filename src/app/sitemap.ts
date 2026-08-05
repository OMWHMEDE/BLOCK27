import type { MetadataRoute } from "next";

// The public, indexable pages. Gives crawlers and verifiers a clean 200 map of
// the site (was 404 before). Canonical host is www — the apex redirects to it.
const SITE = "https://www.block27.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const paths = ["/", "/pricing", "/terms", "/privacy", "/refund"];
  return paths.map((path) => ({
    url: `${SITE}${path}`,
    lastModified,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
