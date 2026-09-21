import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/supabase/server";
import { getUserLanguage, isLanguage, LANGUAGES } from "@/lib/lang";

// The user's AI-output language preference (en | fr | ar). GET reads it, POST
// sets it. Every brain call reads users.language and answers in it; this is the
// only surface that writes it. Bearer (native app) or cookie (browser).
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { supabase, user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const language = await getUserLanguage(supabase, user.id);
  return NextResponse.json({ language });
}

export async function POST(request: Request) {
  const { supabase, user } = await authenticateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { language?: unknown };
  if (!isLanguage(body.language)) {
    return NextResponse.json(
      { error: `language must be one of: ${LANGUAGES.join(", ")}` },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("users")
    .update({ language: body.language })
    .eq("id", user.id);
  if (error) {
    console.error("[account] language update failed", error.message);
    return NextResponse.json({ error: "could not save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, language: body.language });
}
