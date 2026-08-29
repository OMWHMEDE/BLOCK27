import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { GarmentAnalysis } from "@/lib/brain/types";

// Garment analysis is a bounded perception task run once on every garment. The
// BLOCK27 cost model budgets ~$0.005 for it (Haiku tier); ANALYSIS_MODEL keeps
// the choice a one-line change if a richer taste `read` is worth more spend.
const MODEL = process.env.ANALYSIS_MODEL ?? "claude-haiku-4-5";

const SYSTEM = `You are BLOCK27's eye.

A single menswear garment has been photographed, laid flat. Look once and record
a dense, structured description a stylist would reason with later — the photo is
never seen again, so capture what a stylist would notice, not what a database
wants. Menswear only. Be specific and honest.

One garment per photo. But a naturally-paired item IS one garment even though the
photo shows two objects: a pair of shoes, boots or sneakers, gloves, socks, or a
pair of earrings or cufflinks. Two of the same matching thing worn together is
one garment — record it as one, singular, and do not reject it. Only reject for
"more than one item" when the photo shows genuinely SEPARATE garments — a shirt
and trousers, a jacket and a shoe — two different pieces that would each be their
own wardrobe entry.

Accessories are a category too. When the item is one of these four, set
category='accessory' and accessory_type to the matching kind:
- glasses — eyewear of any sort: prescription glasses or sunglasses. A pair is
  one item.
- watch — a wristwatch.
- chain — a chain or necklace worn at the neck.
- bracelet — a band, cuff or bracelet worn at the wrist.
For every garment that is NOT one of these four — including any other accessory
like a hat, belt or scarf — set accessory_type='none'. An accessory still gets a
real formality, pairs_with, clashes_with and read like any piece.

formality is 1–5: 1 gym, 2 casual, 3 smart casual, 4 sharp, 5 formal.

length matters for bottoms and one-pieces and is often the hardest thing to read
from a folded or bunched photo — read it deliberately. Full-length trousers and
jeans reach the ankle; call the baggy/wide streetwear cut 'wide-leg'; 'cropped'
ends above the ankle; 'shorts' end at or above the knee. If a jean or trouser is
folded so it looks short, judge by the waist-to-hem proportion and the cut, not
the folded outline — a wide-leg jean folded in half still is full-length. Set
length='none' for tops, footwear and accessories.

pairs_with, clashes_with and read are the point. read is your one-line take in
the BLOCK27 voice — certain, unsentimental, on the user's side against bad
clothes. summary is the read-back shown in the wardrobe, format:
"Black slim chinos · casual · pairs with a white tee, bomber, overshirt".

If the photo can't be read — blurry, dark, occluded, two separate garments, not a
garment — set usable false and give a reject_reason the user can act on. Do not
guess: a garment recorded wrong poisons every outfit it ever appears in.

photo_warning is a SEPARATE, non-blocking advisory about the shot — it never
rejects. Populate it in exactly one case: a bottom (trousers, jeans, or a
one-piece with legs) photographed folded or bunched instead of laid out flat and
full-length. That folded shape renders as shorts on the body, so warn even though
you can still read the garment. Judge the garment normally in every other field.
Write it calm and cold, an instruction not a scold, e.g. "Shot folded — it may
render short. Lay it flat, full length, and reshoot." For a flat, full-length
bottom — and for every top, shoe and accessory — leave photo_warning as an empty
string.

Record it with the record_garment tool.`;

// `strict: true` guarantees tool_use.input validates against the schema. It is
// a valid top-level tool field; the cast keeps this robust across SDK versions.
const TOOL = {
  name: "record_garment",
  description: "Record the structured analysis of one garment.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      usable: { type: "boolean" },
      reject_reason: {
        type: "string",
        description: "Why the photo can't be used; empty string when usable.",
      },
      category: {
        type: "string",
        enum: [
          "tops",
          "bottoms",
          "outerwear",
          "footwear",
          "one-piece",
          "accessory",
        ],
      },
      accessory_type: {
        type: "string",
        enum: ["glasses", "watch", "chain", "bracelet", "none"],
        description:
          "The accessory kind when category is accessory; 'none' otherwise.",
      },
      subcategory: { type: "string" },
      length: {
        type: "string",
        enum: ["full-length", "wide-leg", "cropped", "shorts", "none"],
        description:
          "Leg length for bottoms/one-pieces. 'full-length' reaches the ankle; " +
          "'wide-leg' is full-length AND baggy/wide (the streetwear cut); " +
          "'cropped' ends above the ankle; 'shorts' ends at/above the knee. " +
          "'none' for tops, footwear, accessories — anything with no leg length.",
      },
      descriptor: { type: "string", description: "e.g. 'black slim chinos'" },
      colors: { type: "array", items: { type: "string" } },
      pattern: { type: "string" },
      material_guess: { type: "string" },
      formality: { type: "integer", enum: [1, 2, 3, 4, 5] },
      seasons: { type: "array", items: { type: "string" } },
      fit: { type: "string" },
      pairs_with: { type: "string" },
      clashes_with: { type: "string" },
      read: { type: "string" },
      summary: { type: "string" },
      photo_warning: {
        type: "string",
        description:
          "A calm advisory about the PHOTO, not the garment — empty string " +
          "unless the shot itself will hurt the render. Only populate it when a " +
          "bottom (trousers/jeans/one-piece) is shot folded or bunched rather " +
          "than laid out flat and full-length: that folded shape renders as " +
          "shorts. Leave it empty for tops, footwear, accessories, and for any " +
          "bottom laid out flat. This never rejects the garment.",
      },
    },
    required: [
      "usable",
      "reject_reason",
      "category",
      "accessory_type",
      "subcategory",
      "length",
      "descriptor",
      "colors",
      "pattern",
      "material_guess",
      "formality",
      "seasons",
      "fit",
      "pairs_with",
      "clashes_with",
      "read",
      "summary",
      "photo_warning",
    ],
  },
} as unknown as Anthropic.Tool;

export async function analyzeGarmentImage(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
): Promise<GarmentAnalysis> {
  // reads ANTHROPIC_API_KEY from env, server-side. timeout (ms) keeps a hung
  // call under the function's 60s budget so it throws instead of being killed.
  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "record_garment" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          {
            type: "text",
            text: "Analyze this garment. Record it with the tool.",
          },
        ],
      },
    ],
  });

  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Analysis did not return a garment record");
  }
  return block.input as GarmentAnalysis;
}
