// THE HAND.
//
// The hand renders a decision the brain already made. It knows nothing. It has
// no opinion. It is a brush. Every provider hides behind this interface, so the
// provider can be swapped in an hour without touching a single product file.
//
// Nothing outside src/lib/hand may import a concrete provider — see the ESLint
// rule that enforces it.

export type ImageRef = { bucket: string; path: string };

export type RenderResult =
  | { ok: true; image: ImageRef; ms: number; costUsd: number }
  | {
      ok: false;
      reason: "provider_error" | "rejected_input" | "timeout";
      detail: string;
    };

// 'max' and nothing else. There is no standard tier and there never will be.
// This is a literal type on purpose: adding a second tier is impossible without
// deliberately editing this line. Every render is maximum quality. Every one.
export type Quality = "max";

// What the hand can place on the body. FASHN's tryon-max auto-detects the product
// from the image and supports clothing, footwear AND accessories (jewelry, hats,
// bags — verified against FASHN's docs). There is no per-accessory-kind provider
// category — the model detects a watch vs. glasses vs. a chain itself — so all
// four accessory sub_types share ONE render category here: "accessory". It is the
// outermost layer, rendered last (glasses on the face, a watch/bracelet on the
// wrist, a chain over the shirt). Sub-typing lives in the wardrobe, not here.
export type RenderCategory =
  | "tops"
  | "bottoms"
  | "one-piece"
  | "footwear"
  | "accessory";

export interface Hand {
  render(input: {
    person: ImageRef; // who to dress (base photo, or the previous layer)
    garment: ImageRef; // the single garment to put on
    out: ImageRef; // where the provider stores the result — the caller owns paths
    category: RenderCategory;
    quality: Quality;
    // An optional, provider-agnostic instruction describing WHAT is being placed
    // — e.g. "full-length wide-leg trousers, keep the full original length". The
    // brain composes this from what it already knows about the garment; the hand
    // still decides nothing, it only executes a fact the brain recorded. A
    // provider that has no such input ignores it. Kept generic ("instructions"),
    // never FASHN-specific, so the seam stays swappable.
    prompt?: string;
  }): Promise<RenderResult>;
}
