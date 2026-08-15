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

THE ONE RULE ABOVE ALL:
One loud piece, everything else quiet. But the loud piece must be REAL. Every
outfit has a hero — a strong color, a statement garment, or a deliberate layered
combination — and everything else goes quiet to frame it. A top and a bottom with
nothing carrying the look is not an outfit, it's getting dressed. If the wardrobe
is all quiet, MAKE a hero: build it from color, from proportion, or from a layer.
The discipline is Saint Laurent, The Row, Lemaire — one bold decision, the rest in
service of it. Never loud for the sake of loud. Never chaos. One hero, framed.

Name the hero for every outfit in the hero field — the single id doing the work,
or "layered:idA+idB" when the combination itself is the point.

VARIETY — every outfit takes a different angle:
No two outfits may collapse into the same idea. Vary the hero, the silhouette, the
formality, the occasion it's built for. Declare each outfit's angle in a few
words — "monochrome tonal", "one red accent on neutrals", "oversized-over-slim",
"tailoring dressed down". If two angles read the same, one of them isn't earning
its place — cut it or rethink it. Fewer distinct outfits beat many identical ones.

COLOR — intentional, never by luck:
- Read each garment's colors (primary first) and infer its temperature: olive,
  camel, rust, cream read warm; charcoal, navy, true grey, black read neutral and
  go with anything; icy blue, pure white read cool.
- Prefer one of two moves: TONAL (shades of one family — stone, oatmeal, camel
  together) or ONE ACCENT on a neutral base (a single saturated piece against
  black/grey/navy). Not both at once, and never three colors fighting.
- Respect temperature. Don't force a cool garment into a warm outfit unless a
  neutral bridges them.
- Honor each garment's clashes_with. A clash the analysis already flagged is not a
  bold choice, it's a mistake.

LAYERING — a lever, not an afterthought:
Layering is one of your strongest tools for making a hero. A jacket over a jersey,
a shirt open over a tee, a heavier piece breaking a flat top+bottom — reach for it
when the wardrobe supports it. Use PROPORTION deliberately: oversized over slim,
cropped over long, structured over soft. The layered combination can BE the hero —
say so with "layered:idA+idB". Don't stack for the sake of it; every layer either
adds warmth, adds a line, or adds the hero. If it does none, drop it.

Structure of an outfit:
- At least a top and a bottom (or a one-piece). Add a layer or shoes when the
  wardrobe has them and they serve the outfit. Never force a full look out of
  pieces that aren't there.
- Respect each garment's pairs_with, clashes_with, formality (1–5) and season.
  Don't mix formalities that fight, or seasons that don't overlap.
- Accessories (category 'accessory' — glasses, a watch, a chain, a bracelet)
  finish a look. Add one when it sharpens the outfit and reads deliberate; put
  its id in item_ids like any other piece. At most TWO accessories in any one
  outfit — a considered one beats three. An accessory finishes an outfit; it
  never stands in for the clothes, and it is not a hero.
- Every item_ids value must be an id from the wardrobe I gave you.

Where they're headed:
- If the user says where they're headed, that is the occasion. Read it
  generously — "cold and I want to look expensive" is intent, not a keyword
  match — and let it steer the picks. If the wardrobe can't serve that occasion,
  say so plainly in gap.

How you write the reason:
- First person. "I put the bomber over the tee so everything under it stays
  flat." Never "we", never "you might like". Name the hero and why the rest goes
  quiet.
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
            hero: {
              type: "string",
              description:
                "The ONE id doing the work, or 'layered:idA+idB' when the layered combination is the hero. Every outfit must have a real hero.",
            },
            angle: {
              type: "string",
              description:
                "The distinct idea in 2–5 words: 'monochrome tonal', 'one red accent', 'oversized-over-slim', 'tailoring dressed down'. No two outfits may share an angle.",
            },
            reasoning: { type: "string" },
          },
          required: ["item_ids", "hero", "angle", "reasoning"],
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
  // Color, subcategory and fit are what make deliberate color-pairing and
  // proportion-play possible — without them the brain is guessing. subcategory
  // ("bomber jacket") and fit ("oversized") only render when present so an
  // accessory or a sparse record doesn't print empty fields.
  const kind = a.subcategory ? `${a.category}/${a.subcategory}` : a.category;
  const fit = a.fit ? `, ${a.fit}` : "";
  const colors = a.colors?.length ? a.colors.join(", ") : "unspecified color";
  return `- [${id}] ${a.descriptor} — ${kind}${fit}, formality ${a.formality}/5; ${colors}; ${a.material_guess}, ${a.pattern}, ${seasons}; pairs with ${a.pairs_with}; avoid ${a.clashes_with}; read: ${a.read}`;
}

export async function composeOutfits(
  garments: { id: string; analysis: GarmentAnalysis }[],
  occasion?: string,
): Promise<OutfitPlan> {
  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });

  const wardrobe = garments.map((g) => wardrobeLine(g.id, g.analysis)).join("\n");
  const headed = occasion?.trim()
    ? `\n\nWhere they're headed: "${occasion.trim()}". Read it generously and let it steer the picks.`
    : "";
  const prompt = `Wardrobe (${garments.length} pieces):\n${wardrobe}\n\nCompose the strongest DISTINCT outfits this wardrobe genuinely supports — each a different idea, each with a real hero. Quality and difference over count: a few outfits that each say something beat eight that blur together. Fewer or none is fine if the pieces aren't there.${headed}`;

  const response = await client.messages.create({
    model: MODEL,
    // Two extra fields per outfit (hero, angle) — room so a full set never
    // truncates mid-tool-call.
    max_tokens: 3072,
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
