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

formality is 1–5: 1 gym, 2 casual, 3 smart casual, 4 sharp, 5 formal.

pairs_with, clashes_with and read are the point. read is your one-line take in
the BLOCK27 voice — certain, unsentimental, on the user's side against bad
clothes. summary is the read-back shown in the wardrobe, format:
"Black slim chinos · casual · pairs with a white tee, bomber, overshirt".

If the photo can't be read — blurry, dark, occluded, more than one item, not a
garment — set usable false and give a reject_reason the user can act on. Do not
guess: a garment recorded wrong poisons every outfit it ever appears in.

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
      subcategory: { type: "string" },
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
    },
    required: [
      "usable",
      "reject_reason",
      "category",
      "subcategory",
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
