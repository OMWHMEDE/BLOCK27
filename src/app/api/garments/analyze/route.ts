import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { USER_PHOTOS_BUCKET } from "@/lib/photos";
import { analyzeGarmentImage } from "@/lib/brain/analyzeGarment";
import { ERR_GENERIC } from "@/lib/support";

// Node runtime (the Anthropic SDK + Buffer need it), and a duration long enough
// for a vision call. Without this the platform default (~10s) can kill the
// function mid-call, wedging the garment at 'analyzing' with no catchable error.
export const runtime = "nodejs";
export const maxDuration = 60;

// Analyze a garment exactly once. The claim (pending -> analyzing) is atomic and
// scoped to the user by RLS, so a duplicate trigger is a no-op. On success the
// dense text record is stored and status becomes analyzed (or rejected). On a
// transient failure the garment returns to pending so it can be retried later.
export async function POST(request: Request) {
  const { garmentId, reclaim } = (await request.json().catch(() => ({}))) as {
    garmentId?: string;
    reclaim?: boolean;
  };
  if (!garmentId) {
    return NextResponse.json({ error: "garmentId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Claim: only one caller wins the transition to 'analyzing'. Normally that is
  // pending -> analyzing. `reclaim` also allows analyzing -> analyzing, to pick
  // up a row stranded by a function that died mid-analysis without reverting it.
  // The client only sets reclaim once a row is provably dead (watched in
  // 'analyzing' past the vision timeout), so this never interrupts a live call.
  // Either way the claim is atomic — one caller wins — and the analysis below is
  // unchanged.
  const claim = supabase
    .from("garments")
    .update({ status: "analyzing" })
    .eq("id", garmentId)
    .eq("user_id", user.id);
  const { data: claimed, error: claimErr } = await (reclaim
    ? claim.in("status", ["pending", "analyzing"])
    : claim.eq("status", "pending")
  )
    .select("id, photo_path")
    .maybeSingle();

  if (claimErr) {
    // The claim WRITE failed (not a no-op). The usual cause is the DB rejecting
    // status='analyzing' because migration 0003 hasn't been applied. Surface it
    // instead of masquerading as "skipped" — this is what looked like a stuck
    // spinner with no error.
    console.error("[analyze] claim failed", claimErr.message);
    return NextResponse.json(
      { ok: false, error: `Could not start analysis: ${claimErr.message}` },
      { status: 500 },
    );
  }

  if (!claimed) {
    // No error, no row: already analyzing/analyzed, or not this user's garment.
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const { data: file, error: dlErr } = await supabase.storage
      .from(USER_PHOTOS_BUCKET)
      .download(claimed.photo_path);
    if (dlErr || !file) throw new Error("could not read garment photo");

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const analysis = await analyzeGarmentImage(base64, "image/jpeg");

    if (!analysis.usable) {
      const { error: rejErr } = await supabase
        .from("garments")
        .update({
          status: "rejected",
          reject_reason: analysis.reject_reason || "That photo won't work.",
          analysis: null,
        })
        .eq("id", garmentId)
        .eq("user_id", user.id);
      if (rejErr) throw new Error(`store failed: ${rejErr.message}`);
      return NextResponse.json({ ok: true, rejected: true });
    }

    // Project the accessory kind into the queryable sub_type column — only for a
    // real accessory of one of the four typed kinds; null for everything else.
    const ACCESSORY_TYPES = new Set(["glasses", "watch", "chain", "bracelet"]);
    const subType =
      analysis.category === "accessory" &&
      ACCESSORY_TYPES.has(analysis.accessory_type)
        ? analysis.accessory_type
        : null;

    const { error: upErr } = await supabase
      .from("garments")
      .update({
        status: "analyzed",
        analysis,
        reject_reason: null,
        sub_type: subType,
      })
      .eq("id", garmentId)
      .eq("user_id", user.id);
    if (upErr) throw new Error(`store failed: ${upErr.message}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Release the claim so it can be retried; never leave it stuck analyzing.
    const message = err instanceof Error ? err.message : "Analysis failed";
    console.error("[analyze] failed for garment", garmentId, message);
    await supabase
      .from("garments")
      .update({ status: "pending" })
      .eq("id", garmentId)
      .eq("user_id", user.id);
    // The real reason is logged above; the user sees a generic, warm line — no
    // technical/provider detail ever reaches the screen.
    return NextResponse.json({ ok: false, error: ERR_GENERIC }, { status: 500 });
  }
}
