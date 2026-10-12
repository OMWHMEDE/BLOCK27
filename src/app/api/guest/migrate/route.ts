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
// Migration is best-effort and runs more than once: the native app keeps its own
// guest id locally (the server can't clear it), so it re-calls this on later
// launches. Every outcome that is not a genuine auth failure is a SUCCESS —
// already migrated, nothing to migrate, or an unexpected hiccup — so the app
// confirms once and never shows a retry dialog on relaunch. `migrated` is the
// count of pieces moved this call (0 when there was nothing to move). The app
// should treat any 200 / `ok: true` as done, regardless of that count.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    // Header (native app) or cookie (browser). No id → nothing to move, success.
    const guestId = await readGuestId(request);
    const migrated = guestId ? await migrateGuestToUser(user.id, guestId) : 0;
    return NextResponse.json({ ok: true, migrated });
  } catch (err) {
    // Never trap the app in a retry loop over a best-effort migration. Log it and
    // report success — the worst case is the visitor re-adds a few pieces.
    console.error(
      "[guest] migrate route error (reporting success):",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ ok: true, migrated: 0 });
  }
}
