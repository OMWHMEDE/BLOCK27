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

// What the brain returns when it composes outfits from the wardrobe text.
// item_ids reference garment ids it was given; gap is a plain statement of what
// the wardrobe can't do ("" when it served the request).
export type OutfitPlan = {
  outfits: { item_ids: string[]; reasoning: string }[];
  gap: string;
};

// A single shopping recommendation — a real gap the wardrobe has, and the piece
// that would close it. search_query is the terse, shoppable string; it is the
// seam an affiliate/brand link will later wrap. Nothing is wired to a brand yet.
export type Recommendation = {
  category: string; // tops | bottoms | outerwear | footwear | ...
  title: string; // terse label, e.g. "Mid-grey wool trousers"
  look_for: string; // what specifically to look for
  why: string; // why this unlocks the most, in the brain's voice
  price_low: number; // rough USD floor
  price_high: number; // rough USD ceiling
  search_query: string; // shoppable string; the affiliate seam's input
};

// What the brain returns from a shopping consultation. When the wardrobe is
// already strong, solid is true, recommendations is short or empty, and verdict
// says so plainly. The brain never pads the list to sell.
export type ShoppingPlan = {
  verdict: string; // the honest overall read, first person
  solid: boolean; // true → wardrobe is strong; don't buy for the sake of it
  recommendations: Recommendation[]; // most-unlocking first
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
