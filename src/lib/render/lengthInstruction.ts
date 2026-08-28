import type { GarmentAnalysis } from "@/lib/brain/types";

// Turn what the brain already knows about a garment into a plain-language length
// instruction for the hand. This is the fix's core: the analysis knows a jean is
// full-length and wide-leg, but a folded product photo reads as short-and-wide,
// so the provider renders shorts. Telling it the length closes that gap.
//
// Length only — the hand still decides nothing. Only bottoms and one-pieces get
// an instruction (tops/footwear/accessories have no leg length). Pure and free
// of server-only so the backfill and any test harness can share it.

type Length = GarmentAnalysis["length"];

const WIDE_FIT = /\b(wide|baggy|loose|relaxed|oversized|balloon|carpenter|cargo|flare|flared|palazzo)\b/;
const SHORTS_TEXT = /\bshorts?\b/;
const CROP_TEXT = /\bcropp?ed?\b|\bcapri\b|\b7\/8\b|\bankle-length\b/;

// The stored `length` is authoritative when it's a real leg value. It's derived
// from the description only when missing or left "none" on a leg garment — i.e.
// a garment analyzed before this field existed. New uploads never hit the
// fallback.
export function effectiveLength(a: GarmentAnalysis): Length {
  const isLeg = a.category === "bottoms" || a.category === "one-piece";
  if (!isLeg) return "none";

  if (a.length && a.length !== "none") return a.length;

  // Fallback derivation for pre-field garments.
  const text = `${a.subcategory ?? ""} ${a.descriptor ?? ""}`.toLowerCase();
  if (SHORTS_TEXT.test(text)) return "shorts";
  if (CROP_TEXT.test(text)) return "cropped";
  const wide = WIDE_FIT.test(text) || WIDE_FIT.test((a.fit ?? "").toLowerCase());
  return wide ? "wide-leg" : "full-length";
}

// The instruction string for FASHN's `prompt`, or undefined when there's nothing
// to say (not a leg garment, or genuinely unknown). One-pieces name the legs
// explicitly so a full-length jumpsuit isn't cropped either.
export function lengthInstruction(a: GarmentAnalysis): string | undefined {
  const length = effectiveLength(a);
  if (length === "none") return undefined;

  const onePiece = a.category === "one-piece";
  const noun = onePiece ? "one-piece with legs" : "trousers";

  switch (length) {
    case "full-length":
      return `full-length ${noun}, hem breaking at the ankle over the shoes — keep the full original leg length, do not render as shorts or cropped`;
    case "wide-leg":
      return `full-length wide-leg ${noun}, baggy through the leg, hem breaking at the ankle over the shoes — keep the full original leg length, do not render as shorts or cropped`;
    case "cropped":
      return `cropped ${noun} ending just above the ankle — keep the cropped length, do not lengthen to the floor or shorten to shorts`;
    case "shorts":
      return `shorts ending at or above the knee — keep the original short length, do not lengthen into trousers`;
    default:
      return undefined;
  }
}
