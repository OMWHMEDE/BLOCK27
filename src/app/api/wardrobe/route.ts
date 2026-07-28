import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listGarmentThumbs } from "@/lib/supabase/storage";

// The wardrobe as JSON, so the client can cache it and render instantly on
// return instead of blocking on a server round-trip. Signed URLs run a longer
// (but still short-lived) hour so the same URL stays valid across a return
// visit — that stability is what lets the browser reuse the cached image.
export const runtime = "nodejs";

const SIGNED_TTL = 3600;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const garments = await listGarmentThumbs(user.id, SIGNED_TTL);

  return NextResponse.json(
    { garments, savedAt: Date.now() },
    // Metadata only; no image bytes. Let the client hold it, not a shared cache.
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
