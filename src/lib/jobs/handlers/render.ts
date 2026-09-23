import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getHand } from "@/lib/hand";
import type { RenderLayer } from "@/lib/render/layer";
import {
  USER_PHOTOS_BUCKET,
  basePhotoPath,
  renderPath,
  renderTmpPath,
} from "@/lib/photos";
import { removeFromUserPhotos } from "@/lib/supabase/storage";
import { completeJob, failJob, type Job } from "@/lib/jobs";

// Render runs ONE garment layer per worker invocation, so the chain is resumable:
// if an invocation dies, the next one resumes from the last completed layer. The
// job's result payload holds the progress cursor; a step claims the job with
// claim_job_step (no retry accounting — layers aren't attempts), does a single
// hand.render call, then either advances, retries the same layer, finishes, or
// fails. The enqueue kicks the first step; the status poll kicks the next.

const MAX_LAYER_ATTEMPTS = 3; // one try + two retries per layer, transient only
const STEP_LEASE_SECONDS = 180; // one max-tier provider call fits comfortably

type RenderPayload = { outfitId: string; layers: RenderLayer[] };
type RenderProgress = {
  layerIndex: number;
  personPath: string;
  layerAttempt: number;
  tmpPaths: string[];
};

export type StepOutcome = { ok: true } | { ok: false; transient: boolean; detail: string };
export type StepAction =
  | { kind: "advance" }
  | { kind: "finish" }
  | { kind: "retry" }
  | { kind: "fail"; detail: string };

// Pure: given a layer's outcome and where we are, decide what happens next.
// Success on the last layer finishes; success elsewhere advances. A transient
// failure retries the same layer while attempts remain; anything else fails.
export function decideRenderStep(
  outcome: StepOutcome,
  layerIndex: number,
  totalLayers: number,
  layerAttempt: number,
  maxLayerAttempts: number,
): StepAction {
  if (outcome.ok) {
    return layerIndex >= totalLayers - 1 ? { kind: "finish" } : { kind: "advance" };
  }
  if (outcome.transient && layerAttempt + 1 < maxLayerAttempts) {
    return { kind: "retry" };
  }
  return { kind: "fail", detail: outcome.detail };
}

function progressFrom(job: Job, userId: string): RenderProgress {
  const r = (job.result ?? {}) as Partial<RenderProgress>;
  return {
    layerIndex: typeof r.layerIndex === "number" ? r.layerIndex : 0,
    personPath: typeof r.personPath === "string" ? r.personPath : basePhotoPath(userId),
    layerAttempt: typeof r.layerAttempt === "number" ? r.layerAttempt : 0,
    tmpPaths: Array.isArray(r.tmpPaths) ? (r.tmpPaths as string[]) : [],
  };
}

// Run exactly one render step for a job, if it's claimable. Idempotent: a job
// held under a live lease isn't claimable, so overlapping kicks (a fast-polling
// client) are safe no-ops.
export async function runRenderStep(
  admin: SupabaseClient,
  jobId: string,
): Promise<{ claimed: boolean; action?: StepAction["kind"] }> {
  const { data: claimed } = await admin.rpc("claim_job_step", {
    p_id: jobId,
    p_lease_seconds: STEP_LEASE_SECONDS,
  });
  const job = claimed as Job | null;
  if (!job || !job.id) return { claimed: false };

  const userId = job.user_id;
  const payload = (job.payload ?? {}) as Partial<RenderPayload>;
  const outfitId = payload.outfitId;
  const layers = Array.isArray(payload.layers) ? payload.layers : [];

  if (!outfitId || layers.length === 0) {
    await failJob(admin, jobId, "render job has no layers", false);
    return { claimed: true, action: "fail" };
  }

  const p = progressFrom(job, userId);
  const isLast = p.layerIndex >= layers.length - 1;
  const outPath = isLast
    ? renderPath(userId, outfitId)
    : renderTmpPath(userId, outfitId, p.layerIndex);
  const layer = layers[p.layerIndex];

  // One provider call.
  const hand = getHand();
  const result = await hand.render({
    client: admin,
    person: { bucket: USER_PHOTOS_BUCKET, path: p.personPath },
    garment: { bucket: USER_PHOTOS_BUCKET, path: layer.garmentPath },
    out: { bucket: USER_PHOTOS_BUCKET, path: outPath },
    category: layer.category,
    quality: "max",
    prompt: layer.prompt,
  });

  const outcome: StepOutcome = result.ok
    ? { ok: true }
    : {
        ok: false,
        transient: result.reason === "provider_error" || result.reason === "timeout",
        detail: result.detail,
      };
  const action = decideRenderStep(
    outcome,
    p.layerIndex,
    layers.length,
    p.layerAttempt,
    MAX_LAYER_ATTEMPTS,
  );

  if (action.kind === "finish") {
    // Persist the final render, log the (successful) try-on, drop intermediates.
    const { error: upErr } = await admin
      .from("outfits")
      .update({ render_path: outPath })
      .eq("id", outfitId)
      .eq("user_id", userId);
    if (upErr) {
      // Couldn't record it — treat as a failure so the user isn't charged.
      await removeFromUserPhotos(admin, [...p.tmpPaths, outPath]).catch(() => {});
      await failJob(admin, jobId, `store failed: ${upErr.message}`, false);
      return { claimed: true, action: "fail" };
    }
    await admin.from("renders").insert({ user_id: userId, outfit_id: outfitId });
    await removeFromUserPhotos(admin, p.tmpPaths).catch(() => {});
    await completeJob(admin, jobId, { done: true, layers: layers.length }, {});
    return { claimed: true, action: "finish" };
  }

  if (action.kind === "advance") {
    const next: RenderProgress = {
      layerIndex: p.layerIndex + 1,
      personPath: outPath,
      layerAttempt: 0,
      tmpPaths: [...p.tmpPaths, outPath],
    };
    await admin
      .from("jobs")
      .update({ result: next, status: "queued", lease_until: null, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    return { claimed: true, action: "advance" };
  }

  if (action.kind === "retry") {
    const next: RenderProgress = { ...p, layerAttempt: p.layerAttempt + 1 };
    console.warn(
      `[render] layer ${p.layerIndex} transient, retry ${next.layerAttempt}/${MAX_LAYER_ATTEMPTS - 1}`,
    );
    await admin
      .from("jobs")
      .update({ result: next, status: "queued", lease_until: null, updated_at: new Date().toISOString() })
      .eq("id", jobId);
    return { claimed: true, action: "retry" };
  }

  // Terminal failure: clean intermediates, refund the reserved try-on.
  await removeFromUserPhotos(admin, p.tmpPaths).catch(() => {});
  const piece = layer.label ?? layer.category;
  await failJob(admin, jobId, `couldn't place ${piece} — ${action.detail}`, false);
  return { claimed: true, action: "fail" };
}
