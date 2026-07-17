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

export interface Hand {
  render(input: {
    person: ImageRef;
    garment: ImageRef;
    category: "tops" | "bottoms" | "one-piece";
    quality: Quality;
  }): Promise<RenderResult>;
}
