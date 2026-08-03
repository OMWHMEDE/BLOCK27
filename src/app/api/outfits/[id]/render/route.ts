import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBasePhotoUrl, signedUrl } from "@/lib/supabase/storage";
import { renderPath } from "@/lib/photos";
import { renderOutfit, type RenderLayer } from "@/lib/render/renderOutfit";
import { isRenderable } from "@/lib/render/categories";
import { getPlan } from "@/lib/plan";
import type { GarmentAnalysis } from "@/lib/brain/types";
import type { RenderCategory } from "@/lib/hand";

// Rendering runs several ~max-tier provider calls; give it room. NOTE: a
// multi-garment outfit can exceed a 60s platform cap — needs a plan that allows
// this duration (Vercel Pro / 300s). One garment fits comfortably.
export const runtime = "nodejs";
export const maxDuration = 300;

// Fair-use quota. Only successful renders count (failures never do). Defaults
// are the product limits (3/day, 30/month); RENDER_DAILY_LIMIT /
// RENDER_MONTHLY_LIMIT override them (server-only) for founder testing.
function limitFromEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
const DAILY_LIMIT = limitFromEnv("RENDER_DAILY_LIMIT", 3);
const MONTHLY_LIMIT = limitFromEnv("RENDER_MONTHLY_LIMIT", 30);

// The brain decides which garments; the hand only executes. This maps a
// garment's category to a layer ORDER — one-piece/bottoms/tops/outerwear, then
// footwear, then accessories LAST (they sit outermost: glasses on the face, a
// watch/bracelet on the wrist, a chain over the shirt) — and to the provider's
// render category. tryon-max auto-detects the product, so footwear and
// accessories render as trailing layers. Multiple accessories in one outfit are
// simply multiple order-5 layers: FASHN takes one product per call, so they
// chain sequentially, exactly like the clothing layers. The keys here must match
// RENDERABLE_CATEGORIES.
const LAYER: Record<string, { order: number; category: RenderCategory }> = {
  "one-piece": { order: 0, category: "one-piece" },
  bottoms: { order: 1, category: "bottoms" },
  tops: { order: 2, category: "tops" },
  outerwear: { order: 3, category: "tops" },
  footwear: { order: 4, category: "footwear" },
  accessory: { order: 5, category: "accessory" },
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: outfitId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // THE HARD RULE: the hand is paid-only. A free (or guest) account never
  // reaches the provider. This gate is first — before the base photo, the
  // outfit, the layers, the quota — so there is exactly one line between a
  // request and a render, and it is closed for everyone who hasn't paid.
  const plan = await getPlan(user.id);
  if (!plan.paid) {
    return NextResponse.json({
      ok: false,
      paywall: true,
      message: "Try-on is paid. Upgrade to see it on you.",
    });
  }

  // Need a base photo to dress.
  if (!(await getBasePhotoUrl(user.id))) {
    return NextResponse.json({
      ok: false,
      error: "No base photo yet. Capture one first.",
    });
  }

  // The outfit and its garments (own, analyzed).
  const { data: outfit } = await supabase
    .from("outfits")
    .select("id, item_ids")
    .eq("id", outfitId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!outfit) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: garments } = await supabase
    .from("garments")
    .select("id, photo_path, analysis, status")
    .in("id", outfit.item_ids as string[])
    .eq("user_id", user.id)
    .eq("status", "analyzed");

  type OrderedLayer = RenderLayer & { order: number };
  const ranked: RenderLayer[] = (garments ?? [])
    .map((g): OrderedLayer | null => {
      const a = g.analysis as GarmentAnalysis | null;
      const spec = a ? LAYER[a.category] : undefined;
      if (!spec) return null;
      return {
        order: spec.order,
        garmentPath: g.photo_path as string,
        category: spec.category,
        label: a?.descriptor || a?.category || "a piece",
      };
    })
    .filter((x): x is OrderedLayer => x !== null)
    .sort((a, b) => a.order - b.order)
    .map(({ garmentPath, category, label }) => ({ garmentPath, category, label }));

  // Cap accessories at two per outfit. Each accessory is its own sequential
  // max-tier call, so this bounds worst-case cost and latency. The brain is told
  // the same limit; this is the hard backstop. Accessories are the trailing
  // (order 5) layers, so the clothes and shoes are never what gets dropped — the
  // brain's first two accessories (item_ids order) are kept.
  const ACCESSORY_CAP = 2;
  let accessoryCount = 0;
  const dropped: string[] = [];
  const layers = ranked.filter((l) => {
    if (l.category !== "accessory") return true;
    accessoryCount += 1;
    if (accessoryCount <= ACCESSORY_CAP) return true;
    dropped.push(l.label ?? "an accessory");
    return false;
  });

  // Anything the hand can't place on the body. With footwear and accessories now
  // wired, every category the eye assigns is renderable — this stays as a guard
  // so a future unhandled category is surfaced honestly, never silently dropped.
  const unplaceable = (garments ?? [])
    .map((g) => g.analysis as GarmentAnalysis | null)
    .filter((a): a is GarmentAnalysis => !!a && !isRenderable(a.category))
    .map((a) => a.descriptor || a.category);

  console.log(
    "[render] outfit",
    outfitId,
    "| placing:",
    layers.map((l) => l.category),
    "| accessories dropped over cap:",
    dropped,
    "| not placeable on body:",
    unplaceable,
  );

  if (layers.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "Nothing here I can put on you. Add clothes, shoes or an accessory.",
    });
  }

  // Quota — count only successful renders. Skipped entirely for a test-exempt
  // account (same PAID_OVERRIDE_UIDS allowlist as the plan gate above): no daily
  // or monthly cap. Every other account is counted exactly as before.
  if (!plan.exempt) {
    const now = new Date();
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ).toISOString();
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString();

    const [{ count: dayCount }, { count: monthCount }] = await Promise.all([
      supabase
        .from("renders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", dayStart),
      supabase
        .from("renders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStart),
    ]);

    if ((dayCount ?? 0) >= DAILY_LIMIT) {
      return NextResponse.json({
        ok: false,
        quota: true,
        message: `That's ${DAILY_LIMIT} renders today. Come back tomorrow.`,
      });
    }
    if ((monthCount ?? 0) >= MONTHLY_LIMIT) {
      return NextResponse.json({
        ok: false,
        quota: true,
        message: `You've used all ${MONTHLY_LIMIT} renders this month.`,
      });
    }
  }

  // Execute.
  const result = await renderOutfit(user.id, outfitId, layers);
  if (!result.ok) {
    console.error("[render] failed for outfit", outfitId, result.detail);
    return NextResponse.json({ ok: false, error: result.detail }, { status: 500 });
  }

  // Persist: render_path on the outfit, and a quota log row (success only).
  const { error: upErr } = await supabase
    .from("outfits")
    .update({ render_path: result.path })
    .eq("id", outfitId)
    .eq("user_id", user.id);
  if (upErr) {
    return NextResponse.json(
      { ok: false, error: `store failed: ${upErr.message}` },
      { status: 500 },
    );
  }
  await supabase.from("renders").insert({ user_id: user.id, outfit_id: outfitId });

  const url = await signedUrl(renderPath(user.id, outfitId));
  return NextResponse.json({ ok: true, url });
}
