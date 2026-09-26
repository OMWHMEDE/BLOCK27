import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { claimJob, completeJob, failJob, type Job } from "@/lib/jobs";
import { handleComposition } from "@/lib/jobs/handlers/composition";
import { handleShopping } from "@/lib/jobs/handlers/shopping";
import { atOrOverCap, type MeteredOp } from "@/lib/limits";

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

  // Cap gate — defense in depth, on the one path every worker run funnels
  // through, so a re-kick (the generate "active job" path, the status-poll
  // recovery) can never run the worker past the cap. A job carries no
  // reserved_kind only when the user was exempt at enqueue, in which case it is
  // uncapped. We exclude THIS job from the count so the in-cap job it belongs to
  // can still finish; a job beyond the cap is failed terminally, which refunds
  // its reserved slot.
  if (job.reserved_kind && job.reserved_period) {
    const op = job.reserved_kind as MeteredOp;
    const { over } = await atOrOverCap(admin, job.user_id, op, job.reserved_period, {
      excludeJobId: job.id,
    });
    if (over) {
      console.warn(`[jobs] ${op} job ${jobId} refused: over plan cap`);
      await failJob(admin, jobId, "over plan cap", false);
      return { claimed: true, status: "capped" };
    }
  }

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
