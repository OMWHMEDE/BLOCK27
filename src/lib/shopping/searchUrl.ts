// The light shopping path — no catalog integration. A ready-to-shop search URL
// built from the brain's shoppable query, so the user can open real results in
// one tap. It is stored in recommendations.affiliate_url, the monetization seam:
// swapping this for a real affiliate deep link post-launch is a one-line change
// here, no rebuild anywhere else.
//
// One retailer constant keeps the swap trivial. ASOS is menswear-appropriate and
// has an affiliate programme; changing it (or wrapping an affiliate redirect)
// touches only this file.
const RETAILER_SEARCH = "https://www.asos.com/search/";

export function searchUrl(query: string): string {
  const q = query.trim().replace(/\s+/g, " ");
  if (!q) return "";
  return `${RETAILER_SEARCH}?q=${encodeURIComponent(q)}`;
}
