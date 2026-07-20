import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BaseCapture } from "@/components/BaseCapture";

export default async function CapturePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this route; this is defense in depth and gives
  // the client component a guaranteed user id to namespace the upload path.
  if (!user) redirect("/login");

  return <BaseCapture userId={user.id} />;
}
