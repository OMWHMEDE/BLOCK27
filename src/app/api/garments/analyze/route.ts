import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { USER_PHOTOS_BUCKET } from "@/lib/photos";
import { analyzeGarmentImage } from "@/lib/brain/analyzeGarment";

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
  const { garmentId } = (await request.json().catch(() => ({}))) as {
    garmentId?: string;
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

  // Claim: only one caller wins the pending -> analyzing transition.
  const { data: claimed } = await supabase
    .from("garments")
    .update({ status: "analyzing" })
    .eq("id", garmentId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .select("id, photo_path")
    .maybeSingle();

  if (!claimed) {
    // Already analyzing, already done, or not this user's garment.
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
      await supabase
        .from("garments")
        .update({
          status: "rejected",
          reject_reason: analysis.reject_reason || "That photo won't work.",
          analysis: null,
        })
        .eq("id", garmentId)
        .eq("user_id", user.id);
      return NextResponse.json({ ok: true, rejected: true });
    }

    await supabase
      .from("garments")
      .update({ status: "analyzed", analysis, reject_reason: null })
      .eq("id", garmentId)
      .eq("user_id", user.id);
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
    // Return the real reason so the client can show it — the owner can't read
    // the server logs, and a silent failure is why this looked stuck.
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
