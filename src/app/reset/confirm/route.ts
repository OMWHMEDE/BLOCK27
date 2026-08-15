import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Step 2: the target of the emailed reset link. Supabase appends a one-time
// ?code=... (PKCE). We exchange it for a recovery session here — server-side, so
// the session cookie is set on this response — then hand off to the set-password
// form. A missing or expired/consumed code sends the user back to request a new
// link with a plain reason (never a stack trace).
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  const back = (reason: string) =>
    NextResponse.redirect(
      new URL(`/reset?error=${encodeURIComponent(reason)}`, origin),
    );

  if (!code) {
    return back("That link is invalid. Request a new one.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[reset] exchangeCodeForSession:", error.message);
    return back("This link expired. Request a new one.");
  }

  return NextResponse.redirect(new URL("/reset/new", origin));
}
