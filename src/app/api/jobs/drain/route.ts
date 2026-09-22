import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reapJobs } from "@/lib/jobs";

// Scheduled job drain — the safety net under the background queue. It never runs
// the work itself (the fast path is a worker kicked at enqueue time, wired per
// operation); it reaps what a dead worker left behind: requeue jobs whose lease
// lapsed but that still have attempts, terminally fail anything past its retries
// or the hard max age, and refund the quota slot of every job it kills — so a
// stalled background job can never leak a reserved try-on or generation.
//
// Triggered by Vercel Cron (a GET), authorised with CRON_SECRET. Without the
// secret set the route refuses; it never runs open. On the Hobby plan Vercel
// clamps cron to daily — this is a backstop, so daily is acceptable; on Pro,
// tighten the schedule in vercel.json to run it every few minutes.
export const runtime = "nodejs";
export const maxDuration = 60;

function maxAgeSeconds(): number {
  const hours = Number(process.env.JOBS_MAX_AGE_HOURS);
  const h = Number.isFinite(hours) && hours > 0 ? hours : 24;
  return Math.floor(h * 3600);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { requeued, failed } = await reapJobs(admin, maxAgeSeconds());

  console.log(`[jobs] drain: requeued=${requeued} failed=${failed}`);
  return NextResponse.json({ ok: true, requeued, failed });
}
