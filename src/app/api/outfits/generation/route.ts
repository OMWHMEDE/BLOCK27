import { after, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/server";
import { listDraftOutfits } from "@/lib/supabase/storage";
import { kickWorker } from "@/lib/jobs/kick";

// Status + streaming feed for a composition job. The client polls this (and gets
// nudged by Realtime): it returns the job's status and the in-progress
// generation's outfits, which appear one at a time as the worker writes them. It
// also re-kicks a job that's queued or whose worker lease has lapsed, so a
// dropped kick or a dead worker recovers without waiting for the daily drain.
export const runtime = "nodejs";

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

  // Recovery: re-kick a job that hasn't started, or whose worker lease has
  // lapsed. claim_job makes a redundant kick harmless.
  if (status === "queued" || status === "processing") {
    const leaseUntil = job.lease_until
      ? new Date(job.lease_until as string).getTime()
      : 0;
    const stalled = status === "queued" || leaseUntil < Date.now();
    if (stalled) {
      const origin = new URL(request.url).origin;
      after(() => kickWorker(origin, jobId));
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
