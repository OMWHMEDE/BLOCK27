import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plan";

// How many pieces the user can still add. Backs the multi-upload gate so a batch
// that would exceed the limit is stopped before anything uploads. Plan-aware:
// free = 15. This is a UI hint only — the upload route enforces the cap for real.
export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const plan = await getPlan(user.id);
  const { count } = await supabase
    .from("garments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const c = count ?? 0;
  return NextResponse.json({
    count: c,
    limit: plan.pieceLimit,
    remaining: Math.max(0, plan.pieceLimit - c),
    paid: plan.paid,
  });
}
