// Which garment categories the hand can place on the body.
//
// The provider (FASHN) is an APPAREL try-on: it renders garments — tops,
// bottoms, one-pieces — by auto-detecting the garment on the person. It cannot
// place FOOTWEAR or ACCESSORIES: there is no shoe category, and feeding a shoe
// to a garment model auto-detects it as apparel and corrupts the image. So those
// are never sent to the hand. Instead of silently keeping the base photo's own
// shoes (which reads as a wrong result), the outfit surfaces them honestly.
//
// Keep this in sync with the LAYER map in the render route — same four keys.
export const RENDERABLE_CATEGORIES = new Set([
  "one-piece",
  "bottoms",
  "tops",
  "outerwear",
]);

export function isRenderable(category: string | null | undefined): boolean {
  return !!category && RENDERABLE_CATEGORIES.has(category);
}
