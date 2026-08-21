import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { whopServer } from "@/lib/whop/server";
import { whopPlanId, PAID_TIERS, type PaidTier } from "@/lib/whop/plans";
import { ERR_RETRY } from "@/lib/support";

// Create a Whop checkout session for the signed-in user and return its id. The
// session is stamped with metadata.supabase_user_id so the payment webhook can
// link the purchase back to THIS account — a bare planId embed can't, which is
// why checkout goes through a server-created session.
export const runtime = "nodejs";

function isPaidTier(v: unknown): v is PaidTier {
  return typeof v === "string" && (PAID_TIERS as string[]).includes(v);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { tier?: unknown };
  if (!isPaidTier(body.tier)) {
    return NextResponse.json({ ok: false, error: "invalid tier" }, { status: 400 });
  }

  const planId = whopPlanId(body.tier);
  const whop = whopServer();
  if (!planId || !whop) {
    // Plan ids / API key not configured yet — checkout isn't live.
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  try {
    const res = await whop.payments.createCheckoutSession({
      planId,
      metadata: { supabase_user_id: user.id },
    });
    if (res?._error || !res?.id) {
      console.error("[whop] createCheckoutSession failed:", res?._error?.message);
      return NextResponse.json(
        { ok: false, error: ERR_RETRY },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, sessionId: res.id });
  } catch (err) {
    console.error(
      "[whop] createCheckoutSession threw:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { ok: false, error: ERR_RETRY },
      { status: 502 },
    );
  }
}
