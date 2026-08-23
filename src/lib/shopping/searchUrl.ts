// The light shopping path — no catalog integration. A ready-to-shop search URL
// built from the brain's natural-language query, so the user can open real
// results in one tap. Google search (not a single store): the brain writes a
// plain query like "big black bomber jacket", and this opens the full web of
// results so the user shops however they like.
//
// Stored in recommendations.affiliate_url (a historical column name — kept to
// avoid a migration; it now holds a Google search URL, not an affiliate link).
// One constant keeps a future swap — an affiliate redirect, a different engine —
// a one-line change here, touching nothing else.
const SEARCH_URL = "https://www.google.com/search";

export function searchUrl(query: string): string {
  const q = query.trim().replace(/\s+/g, " ");
  if (!q) return "";
  return `${SEARCH_URL}?q=${encodeURIComponent(q)}`;
}
