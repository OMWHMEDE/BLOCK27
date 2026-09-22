import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { USER_PHOTOS_BUCKET, basePhotoPath } from "@/lib/photos";
import { gate } from "@/lib/moderation/gate";
import { logModeration } from "@/lib/moderation/log";
import { getPlan } from "@/lib/plan";
import { paymentsOpen } from "@/lib/payments";
import {
  CONSENT_VERSION,
  hasBiometricConsent,
  purgeBiometricArtifacts,
  touchLastActive,
} from "@/lib/biometric";

// Base photo upload — moderated before storage. The bytes are checked in memory;
// only a passing image is ever written to the permanent bucket. A rejected image
// is never persisted anywhere. The identity comes from the session, never the
// client. Keys stay server-side.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { supabase, user } = await authenticateRequest(request);
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

  // The base photo is biometric data — no storage without current, adult consent.
  if (!(await hasBiometricConsent(supabase, user.id))) {
    return NextResponse.json(
      { ok: false, consentRequired: true, version: CONSENT_VERSION },
      { status: 403 },
    );
  }

  const form = await request.formData().catch(() => null);
  const result = await gate(form?.get("file"), "base");

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
  await touchLastActive(supabase, user.id);
  // A framing warning (legs out of frame) never blocked the store — the photo is
  // valid — but it's returned so the capture screen can offer a retake.
  return NextResponse.json({ ok: true, warning: result.warning ?? "" });
}

// Remove the base photo and, with it, every render derived from it — the user's
// biometric data, destroyed immediately on request. Idempotent.
export async function DELETE(request: Request) {
  const { user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const result = await purgeBiometricArtifacts(admin, user.id);
  return NextResponse.json({ ok: true, ...result });
}
