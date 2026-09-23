import type { RenderCategory } from "@/lib/hand";

// One garment layer in a render plan. The brain decides which garments and in
// what order; the worker executes them one at a time. Kept as its own contract so
// both the render route (which builds the plan) and the render worker (which runs
// it) share the shape without pulling in server-only code.
export type RenderLayer = {
  garmentPath: string;
  category: RenderCategory;
  // Human label (the garment's descriptor) so a failure can name the exact piece
  // that couldn't be placed — "couldn't place the steel diver's watch" — rather
  // than a bare category. Never silently drop a layer; say which one gave out.
  label?: string;
  // Optional provider instruction for this layer — e.g. a bottom's true length.
  // Composed by the caller from the garment's analysis; passed straight to the
  // hand. undefined for layers with nothing to say.
  prompt?: string;
};
