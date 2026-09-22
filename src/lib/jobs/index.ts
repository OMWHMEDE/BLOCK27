import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// The background-jobs seam. A job row is the durable queue: an authenticated
// enqueue writes a 'queued' row (reserving quota alongside it, in the caller),
// a worker claims and runs it, the drain reaps abandoned ones. Every function
// here is a thin wrapper over a SECURITY DEFINER RPC (see migration 0020) so all
// the state transitions stay atomic in the database, never spread across JS.
//
// enqueueJob runs on the user-scoped client (owner-only, via auth.uid()). The
// rest run on the service-role admin client — workers and the drain, which have
// no user session. No operation is wired onto this yet; that arrives per-op.

// Metered operations that become background jobs. Mirrors the DB check and the
// usage_counters kinds.
export type JobKind = "render" | "composition" | "shopping";
export type JobStatus = "queued" | "processing" | "done" | "failed";

export type Job = {
  id: string;
  user_id: string;
  kind: JobKind;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  timings: Record<string, unknown>;
  reserved_kind: JobKind | null;
  reserved_period: string | null;
  lease_until: string | null;
  created_at: string;
  updated_at: string;
};

// Default worker lease. A claim holds the job for this long; if the worker dies,
// the drain reclaims it once the lease lapses. Comfortably longer than the
// slowest single unit of work (one render layer).
const DEFAULT_LEASE_SECONDS = 300;

export type EnqueueInput = {
  kind: JobKind;
  payload?: Record<string, unknown>;
  // When the caller reserved a quota slot before enqueuing, pass its coordinates
  // so a terminal failure refunds it. Omit for unmetered work.
  reservedKind?: JobKind;
  reservedPeriod?: string; // ISO timestamp of the billing-anchored window start
  maxAttempts?: number;
};

// Enqueue a job for the authenticated user. Returns the new job id, or null if
// the RPC failed (the caller should then release any quota it reserved).
export async function enqueueJob(
  supabase: SupabaseClient,
  input: EnqueueInput,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("enqueue_job", {
    p_kind: input.kind,
    p_payload: input.payload ?? {},
    p_reserved_kind: input.reservedKind ?? null,
    p_reserved_period: input.reservedPeriod ?? null,
    p_max_attempts: input.maxAttempts ?? 3,
  });
  if (error) {
    console.error("[jobs] enqueue failed", error.message);
    return null;
  }
  return (data as string) ?? null;
}

// Atomically claim a job for processing. Returns the claimed row, or null when
// nothing was claimable (already done, already held under a live lease, gone).
export async function claimJob(
  admin: SupabaseClient,
  jobId: string,
  leaseSeconds = DEFAULT_LEASE_SECONDS,
): Promise<Job | null> {
  const { data, error } = await admin.rpc("claim_job", {
    p_id: jobId,
    p_lease_seconds: leaseSeconds,
  });
  if (error) {
    console.error("[jobs] claim failed", error.message);
    return null;
  }
  const job = data as Job | null;
  return job && job.id ? job : null;
}

// Mark a claimed job done, storing its result and timing spans.
export async function completeJob(
  admin: SupabaseClient,
  jobId: string,
  result: Record<string, unknown>,
  timings: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await admin.rpc("complete_job", {
    p_id: jobId,
    p_result: result,
    p_timings: timings,
  });
  if (error) console.error("[jobs] complete failed", error.message);
}

// Fail a job. requeue=true returns it to the queue for another attempt while
// attempts remain; otherwise it's a terminal failure that refunds the reserved
// quota slot. Returns the outcome the DB applied.
export async function failJob(
  admin: SupabaseClient,
  jobId: string,
  errorMessage: string,
  requeue: boolean,
): Promise<"requeued" | "failed" | "done" | "missing"> {
  const { data, error } = await admin.rpc("fail_job", {
    p_id: jobId,
    p_error: errorMessage.slice(0, 500),
    p_requeue: requeue,
  });
  if (error) {
    console.error("[jobs] fail failed", error.message);
    return "missing";
  }
  return (data as "requeued" | "failed" | "done" | "missing") ?? "missing";
}

// Refund one reserved quota slot for a specific user — the service-role release
// (release_usage reads auth.uid(), which a worker/drain lacks). Floors at zero.
export async function releaseUsageAdmin(
  admin: SupabaseClient,
  userId: string,
  kind: JobKind,
  periodStart: string,
): Promise<void> {
  const { error } = await admin.rpc("release_usage_admin", {
    p_user_id: userId,
    p_kind: kind,
    p_period_start: periodStart,
  });
  if (error) console.error("[jobs] admin release failed", error.message);
}

export type ReapResult = { requeued: number; failed: number };

// Reap abandoned jobs: requeue expired-lease jobs with attempts left, terminally
// fail (and refund) the dead. Returns how many of each. Called by the drain.
export async function reapJobs(
  admin: SupabaseClient,
  maxAgeSeconds: number,
): Promise<ReapResult> {
  const { data, error } = await admin.rpc("reap_jobs", {
    p_max_age_seconds: maxAgeSeconds,
  });
  if (error) {
    console.error("[jobs] reap failed", error.message);
    return { requeued: 0, failed: 0 };
  }
  const r = (data ?? {}) as Partial<ReapResult>;
  return { requeued: r.requeued ?? 0, failed: r.failed ?? 0 };
}
