import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BaseCapture } from "@/components/BaseCapture";

export default async function CapturePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this route; this is defense in depth. The upload
  // is namespaced server-side from the session, not from a client-supplied id.
  if (!user) redirect("/login");

  return <BaseCapture />;
}
