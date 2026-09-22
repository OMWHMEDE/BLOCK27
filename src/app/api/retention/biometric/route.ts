import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeBiometricArtifacts } from "@/lib/biometric";

// Scheduled biometric retention. Deletes the base photo and all renders for any
// user inactive longer than the retention window (default 12 months), leaving the
// rest of the account intact. Triggered by Vercel Cron (a GET), authorised with
// CRON_SECRET — without the secret set the route refuses, never runs open.
//
// Account deletion and the remove-base action destroy the same artifacts
// immediately; this is the time-based backstop.
export const runtime = "nodejs";
export const maxDuration = 300;

function ttlMonths(): number {
  const n = Number(process.env.BIOMETRIC_TTL_MONTHS);
  return Number.isInteger(n) && n > 0 ? n : 12;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - ttlMonths());
  const cutoffIso = cutoff.toISOString();

  const admin = createAdminClient();
  const { data: users, error } = await admin
    .from("users")
    .select("id")
    .lt("last_active_at", cutoffIso);
  if (error) {
    console.error("[retention] user scan failed", error.message);
    return NextResponse.json({ error: "scan failed" }, { status: 500 });
  }

  let purgedUsers = 0;
  let removed = 0;
  for (const u of users ?? []) {
    const r = await purgeBiometricArtifacts(admin, u.id as string);
    removed += r.removed;
    purgedUsers += 1;
  }

  console.log(
    `[retention] biometric sweep: cutoff=${cutoffIso} users=${purgedUsers} objectsRemoved=${removed}`,
  );
  return NextResponse.json({ ok: true, cutoff: cutoffIso, purgedUsers, removed });
}
