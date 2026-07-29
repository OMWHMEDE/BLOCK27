import { NextResponse } from "next/server";
import { purgeExpiredGuests } from "@/lib/guest/store";

// Scheduled purge of anonymous data. A visitor who never converts leaves
// nothing behind: rows and their storage objects older than the TTL are deleted.
// Triggered by Vercel Cron (a GET), authorised with CRON_SECRET. Without the
// secret set, the route refuses — it never runs open.
export const runtime = "nodejs";
export const maxDuration = 60;

function ttlHours(): number {
  const n = Number(process.env.GUEST_TTL_HOURS);
  return Number.isInteger(n) && n > 0 ? n : 24;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - ttlHours() * 3600 * 1000).toISOString();
  const purged = await purgeExpiredGuests(cutoff);
  return NextResponse.json({ ok: true, cutoff, ...purged });
}
