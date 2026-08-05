import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16's request interceptor (formerly the "middleware" convention).
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on everything except static assets, image optimization, and the
  // crawler files (robots.txt / sitemap.xml) — those must serve raw, with no
  // session lookup or guest cookie, so verifiers get a clean 200.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
