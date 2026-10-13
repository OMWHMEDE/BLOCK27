"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeSource } from "@/lib/waitlist";
import { sendWaitlistConfirmation } from "@/lib/email/waitlist";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Insert the signup, then — only when a brand-new row was created — send the
// confirmation email. A duplicate (23505) means they are already on the list
// and already got the email, so we don't send again. The email is awaited but
// can never fail the signup: sendWaitlistConfirmation swallows its own errors
// and the row is already committed before it runs.
//
// `consent` is true because the form copy states plainly that signing up means
// receiving a launch email — the opt-in is informed. `source` is the marketing
// channel, normalized server-side regardless of what the query string held.
async function addToWaitlist(
  email: string,
  source: string,
): Promise<"ok" | "exists" | "error"> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("waitlist")
    .insert({ email, source: normalizeSource(source), consent: true });

  if (error) {
    if (error.code === "23505") return "exists";
    console.error(
      "[waitlist] insert failed:",
      error.code,
      error.message,
      error.details,
      error.hint,
    );
    return "error";
  }

  // New signup → confirm it. Never lets an email failure surface to the user.
  await sendWaitlistConfirmation(email);
  return "ok";
}

export async function joinWaitlist(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const source = String(formData.get("source") ?? "");

  if (!EMAIL_RE.test(email)) {
    redirect("/waitlist?error=" + encodeURIComponent("That's not an email."));
  }

  const result = await addToWaitlist(email, source);
  if (result === "error") {
    redirect("/waitlist?error=" + encodeURIComponent("That didn't send."));
  }

  redirect("/waitlist?joined=1");
}

// Inline launch-notification capture for the landing page's CTA. Same table and
// same duplicate-is-success handling as joinWaitlist, but it returns a result
// instead of redirecting, so the landing shows an inline confirmation without
// leaving the page. Swap this CTA for the App Store link once the app is live.
export type NotifyResult =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; message: string };

export async function notifyLaunch(
  email: string,
  source?: string,
): Promise<NotifyResult> {
  const clean = (email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) {
    return { status: "error", message: "That's not an email." };
  }

  const result = await addToWaitlist(clean, source ?? "");
  if (result === "error") {
    return { status: "error", message: "That didn't send. Try again." };
  }

  return { status: "ok" };
}
