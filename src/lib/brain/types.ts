// The dense text record the brain writes once per garment, from the photo.
// After this exists, the brain reasons over this text forever — the photo is
// never sent to the model again.

export type GarmentAnalysis = {
  // Quality gate. If the photo can't be read, usable is false and reject_reason
  // says why, in a way the user can act on. A garment recorded wrong poisons
  // every outfit it appears in, so the brain refuses rather than guesses.
  usable: boolean;
  reject_reason: string;

  category: string; // tops | bottoms | outerwear | footwear | one-piece | accessory
  subcategory: string; // "bomber jacket", "slim chinos"
  descriptor: string; // human label, e.g. "black slim chinos"
  colors: string[]; // primary first
  pattern: string; // solid | striped | check | graphic | ...
  material_guess: string; // "nylon", "cotton twill"
  formality: number; // 1 gym … 5 formal
  seasons: string[]; // ["autumn","winter"] or ["all-season"]
  fit: string; // slim | relaxed | oversized | ...
  pairs_with: string;
  clashes_with: string;
  read: string; // the taste note — where the value is
  summary: string; // one-line read-back for the wardrobe
};

// 1–5 formality → a word, for display.
export const FORMALITY_LABELS = [
  "",
  "gym",
  "casual",
  "smart casual",
  "sharp",
  "formal",
] as const;

export function formalityLabel(n: number): string {
  return FORMALITY_LABELS[n] ?? "";
}
