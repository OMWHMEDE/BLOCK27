import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { GarmentAnalysis, OutfitPlan } from "@/lib/brain/types";

// Composition is where taste lives. The BLOCK27 cost model budgets ~$0.01–0.02
// per compose (Sonnet tier); OUTFIT_MODEL keeps it a one-line change to Opus for
// maximum taste.
const MODEL = process.env.OUTFIT_MODEL ?? "claude-sonnet-5";

const SYSTEM = `You are the BLOCK27 brain.

You have the user's wardrobe as text — every garment already analyzed from its
photo. Compose coherent menswear outfits from THESE garments only. You reason
over the text; you never see or ask for images, and you never invent items.

How you build an outfit:
- One loud piece, everything else quiet. Coherence over quantity.
- Respect each garment's pairs_with, clashes_with, formality (1–5) and season.
  Don't mix formalities that fight, or seasons that don't overlap.
- A real outfit is at least a top and a bottom (or a one-piece). Add a layer or
  shoes when the wardrobe has them. Never force a full look out of pieces that
  aren't there.
- Every item_ids value must be an id from the wardrobe I gave you.

How you write the reason:
- First person. "I put the bomber over the tee so everything under it stays
  flat." Never "we", never "you might like".
- Cold, direct, opinionated. No hedging, no flattery, no exclamation marks, no
  emoji. One or two sentences.

Honesty about a thin wardrobe:
- Make only the outfits the wardrobe genuinely supports. Fewer is fine. None is
  fine. Never pad the list with weak combinations.
- If the wardrobe can't serve a real outfit, say so plainly in gap and name what
  is missing: "You've got tops and no bottoms. Add trousers." Leave gap an empty
  string when the wardrobe served the request well.

Record everything with the compose_outfits tool.`;

const TOOL = {
  name: "compose_outfits",
  description: "Record the composed outfits and any wardrobe gap.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      outfits: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            item_ids: {
              type: "array",
              items: { type: "string" },
              description: "Garment ids from the wardrobe, 2 or more.",
            },
            reasoning: { type: "string" },
          },
          required: ["item_ids", "reasoning"],
        },
      },
      gap: {
        type: "string",
        description: "What the wardrobe can't do; empty string when it served.",
      },
    },
    required: ["outfits", "gap"],
  },
} as unknown as Anthropic.Tool;

function wardrobeLine(id: string, a: GarmentAnalysis): string {
  const seasons = a.seasons?.length ? a.seasons.join("/") : "all-season";
  return `- [${id}] ${a.descriptor} — ${a.category}, formality ${a.formality}/5, ${a.material_guess}, ${a.pattern}, ${seasons}; pairs with ${a.pairs_with}; avoid ${a.clashes_with}; read: ${a.read}`;
}

export async function composeOutfits(
  garments: { id: string; analysis: GarmentAnalysis }[],
): Promise<OutfitPlan> {
  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });

  const wardrobe = garments.map((g) => wardrobeLine(g.id, g.analysis)).join("\n");
  const prompt = `Wardrobe (${garments.length} pieces):\n${wardrobe}\n\nCompose the strongest coherent outfits this wardrobe genuinely supports — as many as it earns, up to 8. Fewer or none is fine if the pieces aren't there.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM,
    thinking: { type: "disabled" },
    tools: [TOOL],
    tool_choice: { type: "tool", name: "compose_outfits" },
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Composition did not return a plan");
  }
  return block.input as OutfitPlan;
}
