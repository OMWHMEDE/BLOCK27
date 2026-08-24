import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { USER_PHOTOS_BUCKET, basePhotoPath } from "@/lib/photos";
import { gate } from "@/lib/moderation/gate";
import { logModeration } from "@/lib/moderation/log";
import { getPlan } from "@/lib/plan";
import { paymentsOpen } from "@/lib/payments";

// Base photo upload — moderated before storage. The bytes are checked in memory;
// only a passing image is ever written to the permanent bucket. A rejected image
// is never persisted anywhere. The identity comes from the session, never the
// client. Keys stay server-side.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Base capture is paid-only. Free never uploads a base — the slot is locked
  // behind the 27-field, and this closes the direct path too. Nothing is read or
  // stored for a free account.
  if (!(await getPlan(user.id)).paid) {
    return NextResponse.json({
      ok: false,
      paywall: true,
      reason: paymentsOpen()
        ? "Your base is a paid thing. Upgrade to unlock it."
        : "Base photos open soon.",
    });
  }

  const form = await request.formData().catch(() => null);
  const result = await gate(form?.get("file"));

  if (result.status === "retry") {
    return NextResponse.json({ ok: false, reason: result.reason });
  }
  if (result.status === "reject") {
    await logModeration({
      userId: user.id,
      kind: "base",
      decision: "reject",
      reason: result.reason,
    });
    return NextResponse.json({ ok: false, reason: result.reason });
  }

  // Passed — and only now is anything written.
  const { error } = await supabase.storage
    .from(USER_PHOTOS_BUCKET)
    .upload(basePhotoPath(user.id), result.bytes, {
      upsert: true,
      contentType: result.mediaType,
      cacheControl: "3600",
    });
  if (error) {
    return NextResponse.json({
      ok: false,
      reason: "Didn't save. Check your connection.",
    });
  }

  await logModeration({ userId: user.id, kind: "base", decision: "pass" });
  return NextResponse.json({ ok: true });
}
