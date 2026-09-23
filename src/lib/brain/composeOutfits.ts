import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { GarmentAnalysis, OutfitPlan } from "@/lib/brain/types";
import { languageInstruction, type Language } from "@/lib/lang";

// Composition is where taste lives. The BLOCK27 cost model budgets ~$0.01–0.02
// per compose (Sonnet tier); OUTFIT_MODEL keeps it a one-line change to Opus for
// maximum taste.
const MODEL = process.env.OUTFIT_MODEL ?? "claude-sonnet-5";

// Latency budget for the BATCH composer below (used by the synchronous guest
// flow, which still runs under a 60s function cap). Output length is the dominant
// cost, so it's bounded: a few outfits, a low max_tokens ceiling, a sub-cap
// timeout and NO retries so a slow call throws cleanly rather than 504. The
// authenticated generation now runs in the background worker (composeNextOutfit),
// where the count and reasoning length are free to be fuller.
const MAX_OUTFITS = 3;
// Reasoning length backstop, shared by both paths. Generous enough for the one or
// two sentences the voice calls for; it only trims a genuine runaway.
const MAX_REASONING_CHARS = 320;
const CALL_TIMEOUT_MS = 40_000;
const MAX_TOKENS = 1536;

// Cap one reasoning string without an ugly mid-word cut. Prefer the last sentence
// end within the limit, else the last space; no ellipsis — the voice is terse and
// "…" isn't in it. The model is told to keep it to one or two sentences; this is
// only the backstop that guarantees a sane maximum.
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

const SYSTEM_CORE = `You are the BLOCK27 brain.

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
  emoji. One or two sentences. Name the hero and why the rest goes quiet.

Honesty about a thin wardrobe:
- Make only the outfits the wardrobe genuinely supports. Fewer is fine. None is
  fine. Never pad the list with weak combinations.
- If the wardrobe can't serve a real outfit, say so plainly in gap_points: a list
  of up to FOUR distinct, specific things it can't do, most important first, each
  its own short point — e.g. "You've got tops and no bottoms. Add trousers.",
  "No footwear — nothing renders on the feet." Separate gaps, never one idea split
  across lines. Leave gap_points an empty array when the wardrobe served the
  request well.`;

// The batch tool's closing instruction. The streaming path (composeNextOutfit)
// appends its own, so the shared doctrine above stays tool-agnostic.
const SYSTEM = `${SYSTEM_CORE}

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
                "One or two sentences, first person: the hero and why the rest goes quiet.",
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

// ── Streaming composition ──────────────────────────────────────────────────────
// One outfit per call, so the background worker can write and stream each outfit
// the moment it's decided instead of waiting for the whole set. Each call sees the
// outfits already chosen (their ids and angles) and produces the NEXT distinct
// one, or signals it's done. Keeping it to a single outfit means the strict tool
// schema still validates every field — per-outfit validation, not lost to
// streaming. Small output → each call is quick and the worker stays well under
// its function cap.

// One produced outfit. hero/angle steer the model (variety); only item_ids and
// reasoning are persisted, same as the batch path.
export type NextOutfit = {
  item_ids: string[];
  reasoning: string;
  hero: string;
  angle: string;
};

// The result of asking for one more outfit: an outfit and keep going, or done
// (no further distinct outfit) with the wardrobe's gap points.
export type ComposeStep = {
  outfit: NextOutfit | null;
  gap_points: string[];
  done: boolean;
};

// Prior picks passed back each call so the model varies the angle and never
// repeats a set.
export type PriorOutfit = { item_ids: string[]; angle: string };

const STEP_TIMEOUT_MS = 15_000;
const STEP_MAX_TOKENS = 512;

const NEXT_TOOL = {
  name: "next_outfit",
  description: "Produce the next distinct outfit, or signal there are no more.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      more: {
        type: "boolean",
        description:
          "true if you are giving another distinct outfit now; false if the wardrobe has no further strong, DISTINCT outfit worth showing.",
      },
      item_ids: {
        type: "array",
        items: { type: "string" },
        description: "The pieces for THIS outfit, 2 or more. Empty array when more is false.",
      },
      hero: {
        type: "string",
        description:
          "The one id doing the work, or 'layered:idA+idB'. Empty string when more is false.",
      },
      angle: {
        type: "string",
        description:
          "This outfit's distinct idea in 2–5 words, different from every prior angle. Empty when more is false.",
      },
      reasoning: {
        type: "string",
        description:
          "One or two sentences: the hero and why the rest goes quiet. Empty string when more is false.",
      },
      gap_points: {
        type: "array",
        items: { type: "string" },
        description:
          "Only when more is false: up to 4 distinct things the wardrobe can't do, most important first. Empty otherwise.",
      },
    },
    required: ["more", "item_ids", "hero", "angle", "reasoning", "gap_points"],
  },
} as unknown as Anthropic.Tool;

export async function composeNextOutfit(
  garments: { id: string; analysis: GarmentAnalysis }[],
  occasion: string | undefined,
  language: Language,
  prior: PriorOutfit[],
): Promise<ComposeStep> {
  const client = new Anthropic({ timeout: STEP_TIMEOUT_MS, maxRetries: 0 });

  const wardrobe = garments.map((g) => wardrobeLine(g.id, g.analysis)).join("\n");
  const headed = occasion?.trim()
    ? `\n\nWhere they're headed: "${occasion.trim()}". Read it generously and let it steer the pick.`
    : "";
  const already =
    prior.length > 0
      ? `\n\nAlready composed this run (do not repeat these, and take a different angle):\n${prior
          .map((p, i) => `  ${i + 1}. angle "${p.angle}" — [${p.item_ids.join(", ")}]`)
          .join("\n")}`
      : "\n\nThis is the first outfit of the run.";
  const prompt = `Wardrobe (${garments.length} pieces):\n${wardrobe}${headed}${already}\n\nGive the NEXT single distinct outfit with a real hero and a fresh angle. If the wardrobe has no further strong, distinct outfit worth showing, set more=false and put what it can't do in gap_points. Never pad with a weak or near-duplicate outfit.`;

  const system = `${SYSTEM_CORE}

Produce exactly ONE outfit per call with the next_outfit tool. Set more=true and fill the outfit fields, or more=false with gap_points when there is nothing further worth showing.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: STEP_MAX_TOKENS,
    system: system + languageInstruction(language),
    thinking: { type: "disabled" },
    tools: [NEXT_TOOL],
    tool_choice: { type: "tool", name: "next_outfit" },
    messages: [{ role: "user", content: prompt }],
  });

  const block = response.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Composition step did not return a result");
  }
  const raw = block.input as {
    more?: boolean;
    item_ids?: unknown;
    hero?: unknown;
    angle?: unknown;
    reasoning?: unknown;
    gap_points?: unknown;
  };

  const gap_points = (Array.isArray(raw.gap_points) ? raw.gap_points : [])
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter((p) => p.length > 0)
    .slice(0, 4);

  if (!raw.more) {
    return { outfit: null, gap_points, done: true };
  }

  const item_ids = (Array.isArray(raw.item_ids) ? raw.item_ids : []).filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  return {
    outfit: {
      item_ids,
      hero: typeof raw.hero === "string" ? raw.hero : "",
      angle: typeof raw.angle === "string" ? raw.angle : "",
      reasoning: capReasoning(typeof raw.reasoning === "string" ? raw.reasoning : ""),
    },
    gap_points,
    done: false,
  };
}
