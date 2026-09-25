import { after, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserLanguage } from "@/lib/lang";
import { enqueueJob } from "@/lib/jobs";
import { runJob } from "@/lib/jobs/run";
import { getPlan } from "@/lib/plan";
import { paymentsOpen } from "@/lib/payments";
import { ERR_GENERIC } from "@/lib/support";

// Enqueue a shopping consultation and return immediately; the worker runs the
// reasoning call in the background (in-process via `after`, same invocation) and
// replaces the stored recommendations. The client polls GET for status and
// refreshes when it's done. This route no longer runs the model, so it can't
// approach the function cap.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { supabase, user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { budget?: unknown };
  const raw = Number(body.budget);
  const budget =
    Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), 1_000_000) : null;

  // Nothing to reason from — advise, no job.
  const { count } = await supabase
    .from("garments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "analyzed");
  if ((count ?? 0) === 0) {
    return NextResponse.json({
      ok: true,
      count: 0,
      solid: false,
      advice:
        "Nothing to shop for yet. Add the pieces you already own first — I audit a wardrobe, I don't guess into empty space.",
    });
  }

  // Already consulting? Return the in-flight job, don't reserve twice.
  const { data: active } = await supabase
    .from("jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", "shopping")
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active?.id) {
    const activeId = active.id as string;
    after(() => runJob(createAdminClient(), activeId));
    return NextResponse.json({ ok: true, jobId: activeId, already: true });
  }

  // Reserve a consultation slot up front (fail closed). Refunded on terminal job
  // failure via the job's reserved coordinates.
  const plan = await getPlan(user.id);
  const periodStart = plan.windowStart.toISOString();
  if (!plan.exempt) {
    const { data: reserved, error: reserveErr } = await supabase.rpc("reserve_usage", {
      p_kind: "shopping",
      p_period_start: periodStart,
      p_cap: plan.shoppingPerMonth,
    });
    if (reserveErr) {
      console.error("[shopping] reserve_usage failed", reserveErr.message);
      return NextResponse.json(
        { ok: false, error: "Couldn't check your plan just now. Try again in a moment." },
        { status: 503 },
      );
    }
    if (!reserved) {
      return NextResponse.json({
        ok: true,
        note: `You've used all ${plan.shoppingPerMonth} consultations this cycle.${paymentsOpen() ? " Upgrade for more." : ""}`,
      });
    }
  }

  const language = await getUserLanguage(supabase, user.id);
  const jobId = await enqueueJob(supabase, {
    kind: "shopping",
    payload: { budget, language },
    reservedKind: plan.exempt ? undefined : "shopping",
    reservedPeriod: plan.exempt ? undefined : periodStart,
  });
  if (!jobId) {
    if (!plan.exempt) {
      await supabase.rpc("release_usage", {
        p_kind: "shopping",
        p_period_start: periodStart,
      });
    }
    return NextResponse.json({ ok: false, error: ERR_GENERIC }, { status: 500 });
  }

  after(() => runJob(createAdminClient(), jobId));
  return NextResponse.json({ ok: true, jobId });
}

// Poll: report the consultation's status; drive it if it stalled. On done the
// recommendations are stored, so the client refreshes to show them.
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
  if (status === "queued" || status === "processing") {
    const leaseUntil = job.lease_until
      ? new Date(job.lease_until as string).getTime()
      : 0;
    const stalled = status === "queued" || leaseUntil < Date.now();
    if (stalled) {
      after(() => runJob(createAdminClient(), jobId));
    }
  }

  const result = (job.result as { advice?: string; count?: number } | null) ?? null;
  return NextResponse.json({
    status,
    advice: result?.advice ?? null,
    count: result?.count ?? null,
  });
}
