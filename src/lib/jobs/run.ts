import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { claimJob, completeJob, failJob, type Job } from "@/lib/jobs";
import { handleComposition } from "@/lib/jobs/handlers/composition";
import { handleShopping } from "@/lib/jobs/handlers/shopping";

// One place that turns a queued job into work. Claim (atomic, leased), dispatch
// by kind, then complete or fail. Idempotent: a job already done, or held under a
// live lease, isn't claimable and this is a no-op — so a duplicate kick is safe.

// Shorter than the table default so a worker that dies mid-run becomes
// reclaimable in ~2 minutes rather than five.
const CLAIM_LEASE_SECONDS = 120;

export type HandlerResult = {
  result?: Record<string, unknown>;
  timings?: Record<string, unknown>;
};

async function dispatch(admin: SupabaseClient, job: Job): Promise<HandlerResult> {
  switch (job.kind) {
    case "composition":
      return handleComposition(admin, job);
    case "shopping":
      return handleShopping(admin, job);
    default:
      throw new Error(`no handler for job kind ${job.kind}`);
  }
}

export async function runJob(
  admin: SupabaseClient,
  jobId: string,
): Promise<{ claimed: boolean; status?: string }> {
  const job = await claimJob(admin, jobId, CLAIM_LEASE_SECONDS);
  if (!job) return { claimed: false };
  try {
    const { result, timings } = await dispatch(admin, job);
    await completeJob(admin, jobId, result ?? {}, timings ?? {});
    return { claimed: true, status: "done" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "job failed";
    console.error(`[jobs] ${job.kind} job ${jobId} failed`, msg);
    // Requeue while attempts remain; fail_job turns the last attempt into a
    // terminal failure that refunds the reserved quota slot.
    const status = await failJob(admin, jobId, msg, true);
    return { claimed: true, status };
  }
}
