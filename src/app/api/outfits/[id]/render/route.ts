import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBasePhotoUrl, signedUrl } from "@/lib/supabase/storage";
import { renderPath } from "@/lib/photos";
import { renderOutfit, type RenderLayer } from "@/lib/render/renderOutfit";
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
// garment's category to a layer order (bottoms first, then tops, then
// outerwear) and to the provider's category. Footwear/accessories are skipped —
// try-on renders garments, not shoes.
const LAYER: Record<string, { order: number; category: RenderCategory }> = {
  "one-piece": { order: 0, category: "one-piece" },
  bottoms: { order: 1, category: "bottoms" },
  tops: { order: 2, category: "tops" },
  outerwear: { order: 3, category: "tops" },
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

  const layers: RenderLayer[] = (garments ?? [])
    .map((g) => {
      const a = g.analysis as GarmentAnalysis | null;
      const spec = a ? LAYER[a.category] : undefined;
      return spec
        ? { order: spec.order, garmentPath: g.photo_path as string, category: spec.category }
        : null;
    })
    .filter((x): x is { order: number } & RenderLayer => x !== null)
    .sort((a, b) => a.order - b.order)
    .map(({ garmentPath, category }) => ({ garmentPath, category }));

  if (layers.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "Nothing here to render — this outfit has no tops or bottoms.",
    });
  }

  // Quota — count only successful renders.
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
