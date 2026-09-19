import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/server";

// The latest outfit-composition gap for the signed-in user, so a client can show
// "what your wardrobe can't do" without re-running a generation. Written by the
// generate route on each successful composition. `gap` is null when no generation
// has run yet, an empty string when the last one had no gap.
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { supabase, user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("users")
    .select("latest_gap, latest_gap_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error) {
    console.error("[outfits] gap read failed", error.message);
    return NextResponse.json({ error: "could not read gap" }, { status: 500 });
  }

  return NextResponse.json({
    gap: (data?.latest_gap as string | null) ?? null,
    gapAt: (data?.latest_gap_at as string | null) ?? null,
  });
}
