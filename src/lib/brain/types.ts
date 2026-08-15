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
  // For accessories, the specific kind: glasses | watch | chain | bracelet.
  // "none" for every non-accessory garment (and for accessories outside those
  // four). The garments.sub_type column is populated from this.
  accessory_type: string;
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
//
// hero and angle are STEERING fields: the model must declare, per outfit, the one
// piece (or layered combo) carrying the look and the distinct idea behind it. They
// force a real hero and genuine variety across the set. They are not persisted or
// rendered — the generate route stores only item_ids + reasoning — so they are
// typed optional here: present in the model's output, ignored downstream.
export type OutfitPlan = {
  outfits: {
    item_ids: string[];
    reasoning: string;
    hero?: string;
    angle?: string;
  }[];
  gap: string;
};

// A STRUCTURAL gap the wardrobe has, from the system audit — not a product, a
// weakness. unlocks is the leverage: roughly how many new coherent outfits
// closing this gap would make possible. The list is ranked by it, highest first.
export type ShopGap = {
  need: string; // the gap, terse: "wide dark trousers"
  why: string; // the system reason: "8 tops, 2 bottoms — the bottoms bottleneck"
  unlocks: number; // new outfits this unlocks — the leverage
};

// A specific piece to buy that closes a gap. look_for is the precise, shoppable
// description (cut, colour/undertone, fabric feel, formality, band) — this
// precision is the value. spend is what the brain allocates from the budget to
// this pick (0 when there is no budget). search_query is the retailer-ready
// string the search URL is built from; that URL lands in the affiliate_url seam.
export type ShopPick = {
  category: string;
  title: string; // terse label, e.g. "Mid-grey wool trousers"
  look_for: string; // precise: "wide, matte, mid-rise, dark, under $80"
  why: string; // why this unlocks the most, in the brain's voice
  price_low: number; // rough USD floor
  price_high: number; // rough USD ceiling
  spend: number; // allocated from the budget; 0 when unallocated / no budget
  search_query: string; // shoppable string; the affiliate seam's input
};

// What the brain returns from a shopping consultation. It audits the wardrobe as
// a system (gaps, ranked by leverage), then names the pieces that close the
// biggest ones (picks), allocating a budget across them. When the wardrobe is
// already strong, solid is true and picks is short or empty. advice is the
// closing line — willing to say "stop at two, you already own that". Budget and
// remaining are computed at the route from the input and the picks' spend, not
// trusted from the model's arithmetic.
export type ShoppingPlan = {
  gaps: ShopGap[]; // the system audit, most-leverage first
  picks: ShopPick[]; // specific buys, most-unlocking first
  advice: string; // the closing read, first person; may say buy nothing more
  solid: boolean; // true → wardrobe is strong; don't buy for the sake of it
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
