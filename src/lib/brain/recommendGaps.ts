import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { GarmentAnalysis, ShoppingPlan } from "@/lib/brain/types";

// The shopping consultation. The BLOCK27 cost model budgets ~$0.03–0.05 here
// (Sonnet tier); OUTFIT_MODEL keeps the taste model a one-line change. Reason
// over TEXT only — the stored analyses, never the photos — and hand the model a
// cheap pre-computed summary so it audits the wardrobe as a SYSTEM, not a list.
const MODEL = process.env.OUTFIT_MODEL ?? "claude-sonnet-5";

const SYSTEM = `You are the BLOCK27 brain, advising on what to buy next. This is the killer feature: every other recommender pushes what is popular or what you browsed. You reason from what the user ALREADY OWNS — so you are the only one who can build ON their taste instead of around it, and the only one honest enough to say "not that, you have three". Your job is to make this wardrobe genuinely better with pieces the user will love and actually wear.

You have the user's wardrobe as text — every garment already analyzed from its photo, with its silhouette (subcategory, fit), colour, formality, and a taste note (read) — plus a summary of the wardrobe's shape. You reason over the text; you never see images and you never invent items they own.

Work in this order:

1. READ THEIR STYLE FIRST. Before naming anything, characterize the aesthetic the wardrobe already expresses: the recurring silhouette (slim vs relaxed vs oversized), the palette and its temperature, the formality it lives at, the textures, the overall attitude — e.g. "relaxed dark-neutral streetwear, oversized up top, cool blacks and greys, matte fabrics, nothing sharp or shiny". Write this as style_read. Every piece you go on to name must belong to THIS wardrobe — same silhouette family, same palette, same discipline — so a new piece reads like it was always theirs. You are elevating a taste that already exists, never importing a different one.

2. AUDIT AS A SYSTEM, not a list. Find where the wardrobe is thin FOR THE STYLE they are building:
   - Ratio imbalances — eight tops and two bottoms means every outfit is bottom-constrained.
   - Missing connective pieces — the layer or the shoe that would let pieces they already own finally combine.
   - Palette or texture gaps — the one tonal neighbour or material that multiplies combinations without breaking the look.
   - Formality or season holes — nothing sharp enough, nothing for the cold.
   Each gap gets a "need" (terse), a "why" (concrete and countable), and "unlocks" — roughly how many NEW coherent outfits closing it creates with what they own.

3. RANK BY LEVERAGE, then NAME THE PIECES that raise the wardrobe. Name every same-style piece that meaningfully raises its quality or reach, ordered by impact — usually four to eight. Don't chase a number, but don't hold back good, on-style pieces either: a wardrobe with real gaps deserves a real list. For each pick, look_for must be precise enough to shop with AND unmistakably in their style — cut and silhouette, colour and undertone, fabric feel, formality, and a rough price band: "relaxed, matte, mid-rise, charcoal, wool-blend, under $90", not "trousers". "why" says what it unlocks and why it fits their taste. Give price_low and price_high in whole USD — a good version, not designer, not landfill.

4. ALLOCATE THE BUDGET across the picks in impact order, setting "spend" for each (whole USD, within its band). Spend on the highest-impact pieces first; if the budget runs out before the list does, set the rest to spend 0 — they still get the recommendation, just not the allocation. If there is no budget, set every spend to 0.

Stay honest — this is what makes the list trustworthy:
- Never recommend a piece they effectively already own, and never pad the list with something off-style to hit a number. One piece they'll love and wear beats three filler buys.
- If the wardrobe is genuinely complete for its style — formalities, seasons, palette and silhouettes all covered, plenty of outfits — say so: set solid true and keep the list short. That honesty is rare, and it is the point.

advice is your closing line — first person, cold, direct, one or two sentences, naming the highest-impact buy. No hedging, no flattery, no exclamation marks, no emoji, never "we", never "you might consider".

search_query is what a person would actually type into Google to find the pick — natural and short, plain words, not retailer syntax: "big black bomber jacket", "relaxed charcoal wool trousers", "brown suede chelsea boots". Three to five words, menswear.

Record everything with the plan_shopping tool.`;

const TOOL = {
  name: "plan_shopping",
  description: "Record the wardrobe audit, the picks, and the budget allocation.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      style_read: {
        type: "string",
        description:
          "The wardrobe's established aesthetic — silhouette, palette and temperature, formality, texture, attitude. Every pick must match it.",
      },
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
              description:
                "Precise, shoppable, AND unmistakably in the user's style: cut/silhouette, colour/undertone, fabric, formality, band.",
            },
            why: { type: "string" },
            price_low: { type: "integer" },
            price_high: { type: "integer" },
            spend: {
              type: "integer",
              description: "Whole USD allocated from the budget; 0 when no budget.",
            },
            search_query: {
              type: "string",
              description:
                "A natural short Google query a person would type — plain words, not retailer syntax. E.g. 'big black bomber jacket'.",
            },
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
    required: ["style_read", "gaps", "picks", "advice", "solid"],
  },
} as unknown as Anthropic.Tool;

function wardrobeLine(a: GarmentAnalysis): string {
  const seasons = a.seasons?.length ? a.seasons.join("/") : "all-season";
  const colors = a.colors?.length ? a.colors.join("/") : "unknown";
  // Silhouette (subcategory + fit) and the taste note (read) are what let the
  // brain match a NEW piece to the style the user already has — not just fill a
  // category. Only printed when present so a sparse record stays clean.
  const kind = a.subcategory ? `${a.category}/${a.subcategory}` : a.category;
  const fit = a.fit ? `, ${a.fit}` : "";
  const read = a.read ? `; read: ${a.read}` : "";
  return `- ${a.descriptor} — ${kind}${fit}, ${colors}, formality ${a.formality}/5, ${a.material_guess}, ${a.pattern}, ${seasons}; pairs with ${a.pairs_with}; avoid ${a.clashes_with}${read}`;
}

// A cheap, pre-computed read of the wardrobe's SHAPE — counts and spreads the
// brain would otherwise have to derive. This is the "filter before the brain"
// step: it costs nothing and it steers the model toward system-level thinking
// instead of a flat list.
function wardrobeSummary(analyses: GarmentAnalysis[]): string {
  const byCategory = new Map<string, number>();
  const byColor = new Map<string, number>();
  const byFit = new Map<string, number>();
  const formalities: number[] = [];
  const seasons = new Set<string>();

  for (const a of analyses) {
    byCategory.set(a.category, (byCategory.get(a.category) ?? 0) + 1);
    const primary = a.colors?.[0]?.toLowerCase();
    if (primary) byColor.set(primary, (byColor.get(primary) ?? 0) + 1);
    const fit = a.fit?.toLowerCase();
    if (fit) byFit.set(fit, (byFit.get(fit) ?? 0) + 1);
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
    `By fit: ${fmt(byFit)}`,
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

  const prompt = `Wardrobe shape:\n${summary}\n\nWardrobe (${analyses.length} pieces):\n${wardrobe}\n\n${budgetLine}\n\nRead their style first, audit the wardrobe as a system, and name the same-style pieces that raise it most — ranked by how many outfits each unlocks. Match every pick to the taste they already have. Be honest when the wardrobe is genuinely solid.`;

  const response = await client.messages.create({
    model: MODEL,
    // Room for a style_read plus a fuller same-style pick list (up to ~8).
    max_tokens: 3072,
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
