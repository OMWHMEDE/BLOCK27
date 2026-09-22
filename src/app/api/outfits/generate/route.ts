import { after, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/server";
import { getUserLanguage } from "@/lib/lang";
import { touchLastActive } from "@/lib/biometric";
import { enqueueJob } from "@/lib/jobs";
import { kickWorker } from "@/lib/jobs/kick";
import { getPlan } from "@/lib/plan";
import { paymentsOpen } from "@/lib/payments";
import { ERR_GENERIC } from "@/lib/support";

// Enqueue a composition job and return immediately. The worker composes in the
// background, streaming outfits into a new generation; the client polls
// /api/outfits/generation for status and the streaming drafts. This route no
// longer runs the reasoning call, so it never approaches the function cap.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { supabase, user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await touchLastActive(supabase, user.id);

  const body = (await request.json().catch(() => ({}))) as { occasion?: unknown };
  const occasion =
    typeof body.occasion === "string" ? body.occasion.trim().slice(0, 200) : "";

  // Thin wardrobe: no job, immediate answer (same as the old sync behavior).
  const { count } = await supabase
    .from("garments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "analyzed");
  if ((count ?? 0) < 2) {
    const line = "One analyzed piece isn't an outfit. Add a few more.";
    return NextResponse.json({ ok: true, count: 0, gap: line, gapPoints: [line] });
  }

  // Already composing? Return the in-flight job rather than starting a second one
  // (and no second quota reservation). Re-kick it in case the first kick dropped.
  const { data: active } = await supabase
    .from("jobs")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", "composition")
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (active?.id) {
    const origin = new URL(request.url).origin;
    const activeId = active.id as string;
    after(() => kickWorker(origin, activeId));
    return NextResponse.json({ ok: true, jobId: activeId, already: true });
  }

  // Reserve a composition slot up front (fail closed). Refunded on terminal job
  // failure via the job's reserved coordinates.
  const plan = await getPlan(user.id);
  const periodStart = plan.windowStart.toISOString();
  if (!plan.exempt) {
    const { data: reserved, error: reserveErr } = await supabase.rpc("reserve_usage", {
      p_kind: "composition",
      p_period_start: periodStart,
      p_cap: plan.compositionsPerMonth,
    });
    if (reserveErr) {
      console.error("[outfits] reserve_usage failed", reserveErr.message);
      return NextResponse.json(
        { ok: false, error: "Couldn't check your plan just now. Try again in a moment." },
        { status: 503 },
      );
    }
    if (!reserved) {
      const line = `You've used all ${plan.compositionsPerMonth} generations this cycle.${paymentsOpen() ? " Upgrade for more." : ""}`;
      return NextResponse.json({ ok: true, count: 0, gap: line, gapPoints: [line] });
    }
  }

  const language = await getUserLanguage(supabase, user.id);
  const jobId = await enqueueJob(supabase, {
    kind: "composition",
    payload: { occasion, language },
    reservedKind: plan.exempt ? undefined : "composition",
    reservedPeriod: plan.exempt ? undefined : periodStart,
  });
  if (!jobId) {
    // Enqueue failed — release the slot we reserved so it isn't leaked.
    if (!plan.exempt) {
      await supabase.rpc("release_usage", {
        p_kind: "composition",
        p_period_start: periodStart,
      });
    }
    return NextResponse.json({ ok: false, error: ERR_GENERIC }, { status: 500 });
  }

  const origin = new URL(request.url).origin;
  after(() => kickWorker(origin, jobId));
  return NextResponse.json({ ok: true, jobId });
}
