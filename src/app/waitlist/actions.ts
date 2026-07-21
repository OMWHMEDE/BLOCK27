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
  // Plain insert (anon role) under the waitlist_insert_public policy. A plain
  // INSERT with no `.select()` needs only the INSERT privilege + the INSERT
  // policy's WITH CHECK — no read is involved, so the closed-to-the-public read
  // model can't interfere.
  const { error } = await supabase.from("waitlist").insert({ email });

  // 23505 = unique_violation: the email is already on the list. That is a
  // success, not an error — duplicates are prevented gracefully and the same
  // confirmation shows.
  if (error && error.code !== "23505") {
    // Surface the real cause in the server logs instead of hiding it. A 42501
    // here means the anon role lacks INSERT on the table (grant, not policy).
    console.error(
      "[waitlist] insert failed:",
      error.code,
      error.message,
      error.details,
      error.hint,
    );
    redirect(
      "/waitlist?error=" + encodeURIComponent("Something broke. Try again."),
    );
  }

  redirect("/waitlist?joined=1");
}
