// Which garment categories the hand can place on the body.
//
// The provider (FASHN) renders these by auto-detecting the garment on the
// person. tryon-max (our default model) supports clothing, footwear AND
// accessories (jewelry, hats, bags) — verified against FASHN's docs — so all of
// them render, footwear then accessories as the outermost layers. Every garment
// category the eye can assign is renderable now; nothing is left unplaceable.
//
// Keep this in sync with the LAYER map in the render route — same keys.
export const RENDERABLE_CATEGORIES = new Set([
  "one-piece",
  "bottoms",
  "tops",
  "outerwear",
  "footwear",
  "accessory",
]);

export function isRenderable(category: string | null | undefined): boolean {
  return !!category && RENDERABLE_CATEGORIES.has(category);
}
