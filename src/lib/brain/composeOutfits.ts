import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { GarmentAnalysis, OutfitPlan } from "@/lib/brain/types";
import { languageInstruction, type Language } from "@/lib/lang";

// Composition is where taste lives. The BLOCK27 cost model budgets ~$0.01–0.02
// per compose (Sonnet tier); OUTFIT_MODEL keeps it a one-line change to Opus for
// maximum taste.
const MODEL = process.env.OUTFIT_MODEL ?? "claude-sonnet-5";

// Latency budget. The generate route runs under a 60s function cap (Vercel), and
// this call is nearly all of it. Output length is the dominant cost, so bound it
// hard: at most a few outfits, one short sentence of reasoning each, a low
// max_tokens ceiling. The SDK is given a sub-cap timeout and NO retries, so a
// slow call throws cleanly (caught → quota refunded → clean error) well before
// the function is killed with a 504.
const MAX_OUTFITS = 3;
const MAX_REASONING_CHARS = 160;
const CALL_TIMEOUT_MS = 40_000;
const MAX_TOKENS = 1536;

// Cap one reasoning string without an ugly mid-word cut. Prefer the last sentence
// end within the limit, else the last space; no ellipsis — the voice is terse and
// "…" isn't in it. The model is already told to keep it to one short sentence;
// this is the backstop that guarantees the length regardless.
// Keep at least this much, so a stray early period can't cut the reason to a stub.
const MIN_KEEP = 40;
export function capReasoning(text: string): string {
  const s = (text ?? "").trim();
  if (s.length <= MAX_REASONING_CHARS) return s;
  const cut = s.slice(0, MAX_REASONING_CHARS);
  const sentenceEnd = Math.max(
    cut.lastIndexOf(". "),
    cut.lastIndexOf("! "),
    cut.lastIndexOf("? "),
  );
  if (sentenceEnd >= MIN_KEEP) return cut.slice(0, sentenceEnd + 1).trim();
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace >= MIN_KEEP ? cut.slice(0, lastSpace) : cut).trim();
}

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
  say so plainly in gap_points.

How you write the reason:
- First person. "I put the bomber over the tee so everything under it stays
  flat." Never "we", never "you might like". Name the hero and why the rest goes
  quiet.
- Cold, direct, opinionated. No hedging, no flattery, no exclamation marks, no
  emoji. Exactly ONE sentence, about 140 characters — no more. Say the hero and
  why the rest goes quiet, nothing else.

Honesty about a thin wardrobe:
- Make only the outfits the wardrobe genuinely supports. Fewer is fine. None is
  fine. Never pad the list with weak combinations.
- If the wardrobe can't serve a real outfit, say so plainly in gap_points: a list
  of up to FOUR distinct, specific things it can't do, most important first, each
  its own short point — e.g. "You've got tops and no bottoms. Add trousers.",
  "No footwear — nothing renders on the feet." Separate gaps, never one idea split
  across lines. Leave gap_points an empty array when the wardrobe served the
  request well.

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
            reasoning: {
              type: "string",
              description:
                "One sentence, ~140 characters max: the hero and why the rest goes quiet. No more.",
            },
          },
          required: ["item_ids", "hero", "angle", "reasoning"],
        },
      },
      gap_points: {
        type: "array",
        items: { type: "string" },
        description:
          "Up to 4 distinct things the wardrobe can't do, most important first, " +
          "each its own short point; empty array when it served the request.",
      },
    },
    required: ["outfits", "gap_points"],
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
  language: Language = "en",
): Promise<OutfitPlan> {
  // No retries: a retry could double the wait past the 60s function cap and turn
  // a clean timeout into a 504. One attempt, bounded well under the cap.
  const client = new Anthropic({ timeout: CALL_TIMEOUT_MS, maxRetries: 0 });

  const wardrobe = garments.map((g) => wardrobeLine(g.id, g.analysis)).join("\n");
  const headed = occasion?.trim()
    ? `\n\nWhere they're headed: "${occasion.trim()}". Read it generously and let it steer the picks.`
    : "";
  const prompt = `Wardrobe (${garments.length} pieces):\n${wardrobe}\n\nCompose AT MOST ${MAX_OUTFITS} of the strongest DISTINCT outfits this wardrobe genuinely supports — each a different idea, each with a real hero. Quality and difference over count: ${MAX_OUTFITS} outfits that each say something beat a longer list that blurs together. Fewer or none is fine if the pieces aren't there.${headed}`;

  const response = await client.messages.create({
    model: MODEL,
    // Bounded output is the main latency lever. A few short outfits fit
    // comfortably; this ceiling caps worst-case generation time.
    max_tokens: MAX_TOKENS,
    system: SYSTEM + languageInstruction(language),
    thinking: { type: "disabled" },
    tools: [TOOL],
    tool_choice: { type: "tool", name: "compose_outfits" },
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Composition did not return a plan");
  }
  const raw = block.input as Omit<OutfitPlan, "gap">;

  // Enforce the caps server-side — never trust the model to have held the count
  // or the length. Keep at most MAX_OUTFITS, and cap each reasoning string so a
  // long one can't bloat what's stored or shown (the model is already asked to
  // keep it to one short sentence; this guarantees it).
  const outfits = (Array.isArray(raw.outfits) ? raw.outfits : [])
    .slice(0, MAX_OUTFITS)
    .map((o) => ({ ...o, reasoning: capReasoning(o.reasoning) }));

  // Normalize the points (trim, drop blanks, cap at four) and derive the single
  // line the existing consumers still read.
  const gap_points = (Array.isArray(raw.gap_points) ? raw.gap_points : [])
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter((p) => p.length > 0)
    .slice(0, 4);

  return { outfits, gap_points, gap: gap_points.join(" ") };
}
