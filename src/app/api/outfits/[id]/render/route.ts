import { after, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBasePhotoUrl, signedUrl } from "@/lib/supabase/storage";
import { renderPath } from "@/lib/photos";
import type { RenderLayer } from "@/lib/render/layer";
import { isRenderable } from "@/lib/render/categories";
import { getPlan } from "@/lib/plan";
import { paymentsOpen } from "@/lib/payments";
import { lengthInstruction } from "@/lib/render/lengthInstruction";
import {
  CONSENT_VERSION,
  hasBiometricConsent,
  touchLastActive,
} from "@/lib/biometric";
import { enqueueJob } from "@/lib/jobs";
import { runRenderStep } from "@/lib/jobs/handlers/render";
import { ERR_RETRY } from "@/lib/support";
import type { GarmentAnalysis } from "@/lib/brain/types";
import type { RenderCategory } from "@/lib/hand";

// Rendering runs as a background job — one garment layer per invocation, so the
// chain is resumable (a died invocation resumes from the last completed layer).
// POST validates, reserves the try-on, builds the layer plan, enqueues, and kicks
// the first layer. GET reports progress, drives the next layer, and returns the
// final image when done. Each invocation may run one max-tier provider call, so
// the duration is generous.
export const runtime = "nodejs";
export const maxDuration = 300;

// Maps a garment's category to a layer ORDER (one-piece/bottoms/tops/outerwear,
// then footwear, then accessories last) and to the provider's render category.
const LAYER: Record<string, { order: number; category: RenderCategory }> = {
  "one-piece": { order: 0, category: "one-piece" },
  bottoms: { order: 1, category: "bottoms" },
  tops: { order: 2, category: "tops" },
  outerwear: { order: 3, category: "tops" },
  footwear: { order: 4, category: "footwear" },
  accessory: { order: 5, category: "accessory" },
};

const ACCESSORY_CAP = 2;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: outfitId } = await params;

  const { supabase, user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // The hand is paid-only — first gate, before anything else.
  const plan = await getPlan(user.id);
  if (!plan.paid) {
    return NextResponse.json({
      ok: false,
      paywall: true,
      message: paymentsOpen()
        ? "Try-on is paid. Upgrade to see it on you."
        : "Try-ons open soon.",
    });
  }

  // Rendering produces biometric data — no render without current, adult consent.
  if (!(await hasBiometricConsent(supabase, user.id))) {
    return NextResponse.json(
      { ok: false, consentRequired: true, version: CONSENT_VERSION },
      { status: 403 },
    );
  }
  await touchLastActive(supabase, user.id);

  if (!(await getBasePhotoUrl(supabase, user.id))) {
    return NextResponse.json({
      ok: false,
      error: "No base photo yet. Capture one first.",
    });
  }

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
        prompt: a ? lengthInstruction(a) : undefined,
      };
    })
    .filter((x): x is OrderedLayer => x !== null)
    .sort((a, b) => a.order - b.order)
    .map(({ garmentPath, category, label, prompt }) => ({
      garmentPath,
      category,
      label,
      prompt,
    }));

  // Cap accessories at two — each is its own sequential max-tier call.
  let accessoryCount = 0;
  const layers = ranked.filter((l) => {
    if (l.category !== "accessory") return true;
    accessoryCount += 1;
    return accessoryCount <= ACCESSORY_CAP;
  });

  const unplaceable = (garments ?? [])
    .map((g) => g.analysis as GarmentAnalysis | null)
    .filter((a): a is GarmentAnalysis => !!a && !isRenderable(a.category))
    .map((a) => a.descriptor || a.category);
  if (unplaceable.length > 0) {
    console.log("[render] not placeable on body:", unplaceable);
  }

  if (layers.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "Nothing here I can put on you. Add clothes, shoes or an accessory.",
    });
  }

  // Already rendering this outfit? Return the in-flight job, don't reserve twice.
  const { data: active } = await supabase
    .from("jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", "render")
    .eq("payload->>outfitId", outfitId)
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active?.id) {
    const activeId = active.id as string;
    after(() => runRenderStep(createAdminClient(), activeId));
    return NextResponse.json({ ok: true, jobId: activeId, already: true });
  }

  // Reserve a try-on up front (fail closed). Refunded on terminal job failure.
  const periodStart = plan.windowStart.toISOString();
  if (!plan.exempt) {
    const { data: reserved, error: reserveErr } = await supabase.rpc("reserve_usage", {
      p_kind: "render",
      p_period_start: periodStart,
      p_cap: plan.tryOnsPerMonth,
    });
    if (reserveErr) {
      console.error("[render] reserve_usage failed", reserveErr.message);
      return NextResponse.json({ ok: false, error: ERR_RETRY }, { status: 500 });
    }
    if (!reserved) {
      return NextResponse.json({
        ok: false,
        quota: true,
        message: `You've used all ${plan.tryOnsPerMonth} try-ons this cycle.`,
      });
    }
  }

  const jobId = await enqueueJob(supabase, {
    kind: "render",
    payload: { outfitId, layers },
    reservedKind: plan.exempt ? undefined : "render",
    reservedPeriod: plan.exempt ? undefined : periodStart,
  });
  if (!jobId) {
    if (!plan.exempt) {
      await supabase.rpc("release_usage", { p_kind: "render", p_period_start: periodStart });
    }
    return NextResponse.json({ ok: false, error: ERR_RETRY }, { status: 500 });
  }

  after(() => runRenderStep(createAdminClient(), jobId));
  return NextResponse.json({ ok: true, jobId });
}

// Poll: report the render's status and progress, drive the next layer when the
// job is idle between layers (or its worker died), and return the final image
// when done. claim_job_step keeps overlapping drives a safe no-op.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: outfitId } = await params;

  const { supabase, user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status, result, payload, lease_until")
    .eq("user_id", user.id)
    .eq("kind", "render")
    .eq("payload->>outfitId", outfitId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!job) {
    // No render job: the outfit may already carry a finished render.
    const url = await signedUrl(supabase, renderPath(user.id, outfitId));
    return NextResponse.json({ status: "none", url: url ?? null });
  }

  const status = job.status as string;
  const payloadLayers = (job.payload as { layers?: unknown[] } | null)?.layers;
  const totalLayers = Array.isArray(payloadLayers) ? payloadLayers.length : 0;
  const progress = (job.result as { layerIndex?: number } | null) ?? null;
  const layerIndex = typeof progress?.layerIndex === "number" ? progress.layerIndex : 0;

  // Drive the next layer when the job is idle between steps or its lease lapsed.
  if (status === "queued" || status === "processing") {
    const leaseUntil = job.lease_until
      ? new Date(job.lease_until as string).getTime()
      : 0;
    const stalled = status === "queued" || leaseUntil < Date.now();
    if (stalled) {
      const jobId = job.id as string;
      after(() => runRenderStep(createAdminClient(), jobId));
    }
  }

  const url =
    status === "done"
      ? await signedUrl(supabase, renderPath(user.id, outfitId))
      : null;

  return NextResponse.json({
    status,
    layer: Math.min(layerIndex + 1, totalLayers || layerIndex + 1),
    totalLayers,
    url: url ?? null,
  });
}
