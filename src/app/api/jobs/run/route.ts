import { after, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runJob } from "@/lib/jobs/run";

// The background worker. An internal, CRON_SECRET-authorised endpoint kicked at
// enqueue time (and re-kicked by a stalled status poll). It responds 202 at once
// and does the work in `after`, within this invocation's lifetime (bounded by
// maxDuration). claim_job makes a duplicate kick a safe no-op, so overlapping
// kicks never double-run a job.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { jobId } = (await request.json().catch(() => ({}))) as { jobId?: string };
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  const admin = createAdminClient();
  after(async () => {
    try {
      await runJob(admin, jobId);
    } catch (e) {
      console.error("[jobs] worker crashed", e instanceof Error ? e.message : "");
    }
  });

  return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
}
