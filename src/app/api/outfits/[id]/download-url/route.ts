import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/supabase/storage";

// A fresh, short-lived signed URL for an outfit's render, so the client can
// fetch the bytes and composite the download watermark. Owner-scoped by RLS.
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: outfit } = await supabase
    .from("outfits")
    .select("render_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const path = outfit?.render_path as string | null | undefined;
  if (!path) {
    return NextResponse.json({ error: "no render" }, { status: 404 });
  }

  const url = await signedUrl(path, 120);
  if (!url) {
    return NextResponse.json({ error: "could not sign" }, { status: 500 });
  }

  return NextResponse.json({ url });
}
