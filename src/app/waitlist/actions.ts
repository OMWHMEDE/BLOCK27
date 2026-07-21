"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function joinWaitlist(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!EMAIL_RE.test(email)) {
    redirect("/waitlist?error=" + encodeURIComponent("That's not an email."));
  }

  const supabase = await createClient();
  // Anonymous insert (anon role) under the waitlist_insert_public policy.
  // ignoreDuplicates makes it INSERT ... ON CONFLICT DO NOTHING, so a repeat
  // email is a silent no-op, not an error — the same confirmation shows either
  // way. No `.select()`, so no read permission is needed.
  const { error } = await supabase
    .from("waitlist")
    .upsert({ email }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    redirect(
      "/waitlist?error=" + encodeURIComponent("Something broke. Try again."),
    );
  }

  redirect("/waitlist?joined=1");
}
