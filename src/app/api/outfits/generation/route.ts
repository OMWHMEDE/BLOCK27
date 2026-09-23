import { after, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listDraftOutfits } from "@/lib/supabase/storage";
import { runJob } from "@/lib/jobs/run";

// Status + streaming feed for a composition job. The client polls this (and gets
// nudged by Realtime): it returns the job's status and the in-progress
// generation's outfits, which appear one at a time as the worker writes them. It
// also RECOVERS a stalled run: if the job is queued or its worker lease lapsed,
// it runs the job in-process in an `after` hook (idempotent via claim_job), so a
// generation started on an instance that died still finishes — no dependence on
// the daily drain. maxDuration gives that recovery run room to complete.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { supabase, user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const jobId = new URL(request.url).searchParams.get("job");
  if (!jobId) {
    return NextResponse.json({ error: "job required" }, { status: 400 });
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status, lease_until, result")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!job) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const status = job.status as string;

  // Recovery: run a job that hasn't started, or whose worker lease has lapsed,
  // in-process after the response. claim_job makes this a no-op when a live run
  // already holds the job, so polling every ~1.5s can't spawn overlapping runs.
  if (status === "queued" || status === "processing") {
    const leaseUntil = job.lease_until
      ? new Date(job.lease_until as string).getTime()
      : 0;
    const stalled = status === "queued" || leaseUntil < Date.now();
    if (stalled) {
      after(() => runJob(createAdminClient(), jobId));
    }
  }

  // The streaming drafts — the in-progress generation. Empty once done (the swap
  // has published them, so the client refreshes to the normal outfits list).
  const outfits = status === "done" ? [] : await listDraftOutfits(supabase, user.id);
  const result = (job.result as { gap?: string; gapPoints?: string[] } | null) ?? null;

  return NextResponse.json({
    status,
    outfits,
    gap: result?.gap ?? null,
    gapPoints: result?.gapPoints ?? null,
  });
}
