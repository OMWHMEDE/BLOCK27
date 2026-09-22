import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/server";
import {
  CONSENT_TEXT,
  CONSENT_VERSION,
  hasBiometricConsent,
} from "@/lib/biometric";

// Biometric consent (BIPA / GDPR). GET returns the current consent text, its
// version, and whether this user has already consented to it. POST records the
// user's consent for the current version with their 18-or-older attestation; the
// IP is captured server-side, never taken from the body. Bearer or cookie.
export const runtime = "nodejs";

function clientIp(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}

export async function GET(request: Request) {
  const { supabase, user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const consented = await hasBiometricConsent(supabase, user.id);
  return NextResponse.json({
    version: CONSENT_VERSION,
    text: CONSENT_TEXT,
    consented,
  });
}

export async function POST(request: Request) {
  const { supabase, user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { isAdult?: unknown };
  if (body.isAdult !== true) {
    return NextResponse.json(
      { error: "You must confirm you are 18 or older to consent." },
      { status: 400 },
    );
  }

  // Append-only per (user, version). Re-consent to the same version is a no-op
  // that keeps the original record (its timestamp and IP are the audit).
  const { error } = await supabase.from("biometric_consent").upsert(
    {
      user_id: user.id,
      consent_version: CONSENT_VERSION,
      is_adult: true,
      ip: clientIp(request),
    },
    { onConflict: "user_id,consent_version", ignoreDuplicates: true },
  );
  if (error) {
    console.error("[consent] record failed", error.message);
    return NextResponse.json(
      { error: "could not record consent" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, version: CONSENT_VERSION });
}
