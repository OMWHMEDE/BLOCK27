import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { GarmentAnalysis, ShoppingPlan } from "@/lib/brain/types";

// The shopping consultation. The BLOCK27 cost model budgets ~$0.03–0.05 here
// (Sonnet tier); OUTFIT_MODEL keeps the taste model a one-line change. Reason
// over TEXT only — the stored analyses, never the photos — and hand the model a
// cheap pre-computed summary so it audits the wardrobe as a SYSTEM, not a list.
const MODEL = process.env.OUTFIT_MODEL ?? "claude-sonnet-5";

const SYSTEM = `You are the BLOCK27 brain, advising on what to buy next. This is the killer feature: every other recommender pushes what is popular or what you browsed. You are the only one that reasons from what the user ALREADY OWNS — which means you are the only one that can say "don't buy that, you have three". That honesty is what earns the trust that makes the one thing you DO recommend worth buying.

You have the user's wardrobe as text — every garment already analyzed from its photo — plus a summary of its shape. You reason over the text; you never see images and you never invent items they own.

Work in this order:

1. AUDIT THE WARDROBE AS A SYSTEM, not a list. Look for STRUCTURAL weaknesses:
   - Ratio imbalances — e.g. eight tops and two bottoms means every outfit is bottom-constrained; the bottoms are the bottleneck.
   - Missing connective pieces — no transitional outerwear, no piece that bridges casual and sharp.
   - Colour monoculture — everything one colour; one considered colour can double the combinations.
   - Formality or season holes — nothing for cold weather, nothing above smart-casual.
   Each gap gets a "need" (terse), a "why" (the system reason, concrete and countable), and "unlocks" — roughly how many NEW coherent outfits closing it would create with what they own. That number is the leverage.

2. RANK THE GAPS BY LEVERAGE — highest "unlocks" first. A pair of neutral trousers that lets six orphaned tops finally make outfits beats a flashy jacket that goes with one thing.

3. For the gaps worth closing, name a PICK — a specific piece. look_for must be precise enough to shop with: cut, colour and undertone, fabric feel, formality, and a rough price band. "Wide, matte, mid-rise, dark, under $80" — not "trousers". This precision is the value. Give price_low and price_high in whole USD: a sensible range for a good version, not designer, not landfill. Order picks most-unlocking first — usually one to four. Three strong picks beat eight weak ones.

4. ALLOCATE THE BUDGET across the picks in leverage order, setting "spend" for each (whole USD, within its price band). Spend on the highest-leverage gaps first. LEAVING BUDGET UNSPENT IS VALID AND OFTEN CORRECT — do not invent a purchase to use it up. If there is no budget, set every spend to 0 and advise without allocation.

Honesty over selling:
- If the wardrobe already covers its formalities, seasons and colours and makes plenty of outfits, say so: set solid true, recommend little or nothing, and tell them to keep their money.
- Never pad the list. Be willing to say the third thing they're eyeing is a hoodie and they own four. You are on the user's side, against wasted money.

advice is your closing line — first person, cold, direct, one or two sentences. "I'd stop at the trousers. The rest the wardrobe already answers." No hedging, no flattery, no exclamation marks, no emoji, never "we", never "you might consider".

search_query is a terse, retailer-search-ready string for the pick (menswear), e.g. "mens wide leg dark trousers matte".

Record everything with the plan_shopping tool.`;

const TOOL = {
  name: "plan_shopping",
  description: "Record the wardrobe audit, the picks, and the budget allocation.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      gaps: {
        type: "array",
        description: "The structural audit, highest-leverage first.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            need: { type: "string" },
            why: { type: "string" },
            unlocks: {
              type: "integer",
              description: "New coherent outfits closing this gap would unlock.",
            },
          },
          required: ["need", "why", "unlocks"],
        },
      },
      picks: {
        type: "array",
        description: "Specific buys, most-unlocking first. Empty is valid when solid.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            category: { type: "string" },
            title: { type: "string" },
            look_for: {
              type: "string",
              description: "Precise, shoppable: cut, colour/undertone, fabric, formality, band.",
            },
            why: { type: "string" },
            price_low: { type: "integer" },
            price_high: { type: "integer" },
            spend: {
              type: "integer",
              description: "Whole USD allocated from the budget; 0 when no budget.",
            },
            search_query: { type: "string" },
          },
          required: [
            "category",
            "title",
            "look_for",
            "why",
            "price_low",
            "price_high",
            "spend",
            "search_query",
          ],
        },
      },
      advice: {
        type: "string",
        description: "The closing read, first person. May say buy nothing more.",
      },
      solid: {
        type: "boolean",
        description: "True when the wardrobe is strong and needs little or nothing.",
      },
    },
    required: ["gaps", "picks", "advice", "solid"],
  },
} as unknown as Anthropic.Tool;

function wardrobeLine(a: GarmentAnalysis): string {
  const seasons = a.seasons?.length ? a.seasons.join("/") : "all-season";
  const colors = a.colors?.length ? a.colors.join("/") : "unknown";
  return `- ${a.descriptor} — ${a.category}, ${colors}, formality ${a.formality}/5, ${a.material_guess}, ${a.pattern}, ${seasons}; pairs with ${a.pairs_with}; avoid ${a.clashes_with}`;
}

// A cheap, pre-computed read of the wardrobe's SHAPE — counts and spreads the
// brain would otherwise have to derive. This is the "filter before the brain"
// step: it costs nothing and it steers the model toward system-level thinking
// instead of a flat list.
function wardrobeSummary(analyses: GarmentAnalysis[]): string {
  const byCategory = new Map<string, number>();
  const byColor = new Map<string, number>();
  const formalities: number[] = [];
  const seasons = new Set<string>();

  for (const a of analyses) {
    byCategory.set(a.category, (byCategory.get(a.category) ?? 0) + 1);
    const primary = a.colors?.[0]?.toLowerCase();
    if (primary) byColor.set(primary, (byColor.get(primary) ?? 0) + 1);
    if (typeof a.formality === "number") formalities.push(a.formality);
    for (const s of a.seasons ?? []) seasons.add(s.toLowerCase());
  }

  const fmt = (m: Map<string, number>) =>
    [...m.entries()]
      .sort((x, y) => y[1] - x[1])
      .map(([k, n]) => `${k} ${n}`)
      .join(", ") || "none";

  const formalityRange = formalities.length
    ? `${Math.min(...formalities)}–${Math.max(...formalities)}`
    : "n/a";

  return [
    `Total pieces: ${analyses.length}`,
    `By category: ${fmt(byCategory)}`,
    `By primary colour: ${fmt(byColor)}`,
    `Formality range: ${formalityRange} (of 1–5)`,
    `Seasons covered: ${seasons.size ? [...seasons].join(", ") : "none"}`,
  ].join("\n");
}

export async function recommendGaps(
  garments: { analysis: GarmentAnalysis }[],
  budget: number | null,
): Promise<ShoppingPlan> {
  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });

  const analyses = garments.map((g) => g.analysis);
  const wardrobe = analyses.map(wardrobeLine).join("\n");
  const summary = wardrobeSummary(analyses);
  const budgetLine =
    budget != null
      ? `Budget: $${budget}. Allocate across the picks in leverage order; leave the rest unspent if the next buy isn't worth it.`
      : `Budget: none given. Set every spend to 0 and advise without allocation.`;

  const prompt = `Wardrobe shape:\n${summary}\n\nWardrobe (${analyses.length} pieces):\n${wardrobe}\n\n${budgetLine}\n\nAudit it as a system, rank the gaps by how many outfits each unlocks, and name the pieces that close the biggest ones. Fewer is better; none is right when the wardrobe is solid.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2560,
    system: SYSTEM,
    thinking: { type: "disabled" },
    tools: [TOOL],
    tool_choice: { type: "tool", name: "plan_shopping" },
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Shopping consultation did not return a plan");
  }
  return block.input as ShoppingPlan;
}
