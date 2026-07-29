import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPlan } from "@/lib/plan";
import { BaseCapture } from "@/components/BaseCapture";

export default async function CapturePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Middleware already guards this route; this is defense in depth. The upload
  // is namespaced server-side from the session, not from a client-supplied id.
  if (!user) redirect("/login");

  // Base capture is paid-only. A free user can't reach the uploader — the slot
  // is locked behind the 27-field, and a direct navigation here bounces to the
  // plan. The route below enforces the same rule server-side.
  if (!(await getPlan(user.id)).paid) redirect("/settings");

  return <BaseCapture />;
}
