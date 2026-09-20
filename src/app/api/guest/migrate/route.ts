import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/server";
import { readGuestId } from "@/lib/guest/cookie";
import { migrateGuestToUser } from "@/lib/guest/migrate";

// Fold a guest's pieces into a freshly created account. On the web this runs
// inside the signup server action, which has the guest cookie. The native app
// signs up client-side with the Supabase SDK, so it never hits that action —
// after signup it calls this endpoint with its Bearer token (the new user) and
// its X-Guest-Id header (its local guest id), and we run the same migration.
//
// Idempotent and safe to skip: migrateGuestToUser never throws, and with no
// guest id there is simply nothing to move.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Header (native app) or cookie (browser). Nothing to do without one.
  const guestId = await readGuestId(request);
  if (!guestId) {
    return NextResponse.json({ ok: true, migrated: false });
  }

  await migrateGuestToUser(user.id, guestId);
  return NextResponse.json({ ok: true, migrated: true });
}
