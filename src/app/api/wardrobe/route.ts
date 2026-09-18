import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/server";
import { listGarmentThumbs } from "@/lib/supabase/storage";

// The wardrobe as JSON, so the client can cache it and render instantly on
// return instead of blocking on a server round-trip. Signed URLs run a longer
// (but still short-lived) hour so the same URL stays valid across a return
// visit — that stability is what lets the browser reuse the cached image.
export const runtime = "nodejs";

const SIGNED_TTL = 3600;

export async function GET(request: Request) {
  const { supabase, user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const garments = await listGarmentThumbs(supabase, user.id, SIGNED_TTL);

  return NextResponse.json(
    { garments, savedAt: Date.now() },
    // Metadata only; no image bytes. Let the client hold it, not a shared cache.
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
