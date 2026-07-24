import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { GarmentAnalysis, ShoppingPlan } from "@/lib/brain/types";

// The shopping consultation. The BLOCK27 cost model budgets ~$0.03–0.05 here
// (Sonnet tier); OUTFIT_MODEL keeps the taste model a one-line change.
const MODEL = process.env.OUTFIT_MODEL ?? "claude-sonnet-5";

const SYSTEM = `You are the BLOCK27 brain, advising on what to buy next.

You have the user's wardrobe as text — every garment already analyzed from its
photo. You reason over the text; you never see images and you never invent items
they own.

Your job: find the gaps that matter. A gap that matters is a missing piece that
would unlock the MOST new coherent outfits with what they already own — not a
piece that is merely trendy, and not a duplicate of something they have.

How you choose what to recommend:
- Count combinations, not items. Recommend the piece that turns the most orphaned
  garments into wearable outfits. A single pair of neutral trousers that lets six
  tops finally make an outfit beats a flashy jacket that goes with one thing.
- Respect what they own: formality range, colours, seasons, their evident lean.
  Recommend pieces that bridge and extend, not pieces that fight the wardrobe.
- Be specific. "A mid-grey wool trouser, tapered, no sheen" — not "trousers".
- Price roughly and honestly in USD: a sensible range to pay for a good version
  of that piece, not designer, not landfill. Whole dollars.
- Order recommendations most-unlocking first. Three strong recommendations beat
  eight weak ones. Usually one to four.

Honesty over selling:
- If the wardrobe is already solid — it covers its formalities and seasons and
  makes plenty of outfits — say so plainly, set solid true, and recommend little
  or nothing. An honest "you don't need anything right now" is the whole point.
- Never recommend for the sake of it. Never pad the list. You are on the user's
  side, against wasted money.

Voice:
- First person. "I'd add one pair of dark denim — it's the piece your five tops
  are all waiting on." Never "we", never "you might consider".
- Cold, direct, opinionated. No hedging, no flattery, no exclamation marks, no
  emoji.

Record everything with the recommend_gaps tool.`;

const TOOL = {
  name: "recommend_gaps",
  description: "Record the shopping verdict and any recommendations.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      verdict: {
        type: "string",
        description: "The honest overall read, first person, one to two lines.",
      },
      solid: {
        type: "boolean",
        description: "True when the wardrobe is strong and needs little or nothing.",
      },
      recommendations: {
        type: "array",
        description: "Most-unlocking first. Empty is valid when the wardrobe is solid.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            category: { type: "string" },
            title: { type: "string" },
            look_for: { type: "string" },
            why: { type: "string" },
            price_low: { type: "integer" },
            price_high: { type: "integer" },
            search_query: { type: "string" },
          },
          required: [
            "category",
            "title",
            "look_for",
            "why",
            "price_low",
            "price_high",
            "search_query",
          ],
        },
      },
    },
    required: ["verdict", "solid", "recommendations"],
  },
} as unknown as Anthropic.Tool;

function wardrobeLine(a: GarmentAnalysis): string {
  const seasons = a.seasons?.length ? a.seasons.join("/") : "all-season";
  return `- ${a.descriptor} — ${a.category}, formality ${a.formality}/5, ${a.material_guess}, ${a.pattern}, ${seasons}; pairs with ${a.pairs_with}; avoid ${a.clashes_with}`;
}

export async function recommendGaps(
  garments: { analysis: GarmentAnalysis }[],
): Promise<ShoppingPlan> {
  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });

  const wardrobe = garments.map((g) => wardrobeLine(g.analysis)).join("\n");
  const prompt = `Wardrobe (${garments.length} pieces):\n${wardrobe}\n\nFind the gaps that would unlock the most new outfits. Recommend only what genuinely earns a place — fewer is better, none is fine if the wardrobe is solid.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM,
    thinking: { type: "disabled" },
    tools: [TOOL],
    tool_choice: { type: "tool", name: "recommend_gaps" },
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Shopping consultation did not return a plan");
  }
  return block.input as ShoppingPlan;
}
