// Which garment categories the hand can place on the body.
//
// The provider (FASHN) renders these by auto-detecting the garment on the
// person. tryon-max (our default model) supports clothing AND footwear —
// verified against FASHN's docs and a manual test — so shoes render as the last
// layer. Accessories (hats, jewelry, bags) are ALSO supported by tryon-max but
// are intentionally left out here for now (not yet wired/validated); an outfit
// that contains only accessories is surfaced honestly rather than rendered.
//
// Keep this in sync with the LAYER map in the render route — same keys.
export const RENDERABLE_CATEGORIES = new Set([
  "one-piece",
  "bottoms",
  "tops",
  "outerwear",
  "footwear",
]);

export function isRenderable(category: string | null | undefined): boolean {
  return !!category && RENDERABLE_CATEGORIES.has(category);
}
