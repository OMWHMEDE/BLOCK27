"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
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
// Signups go through here only: the table is closed to the public API, so a
// bot can't fill it directly. Per visitor (a one-way hash of their IP) we
// accept a few signups an hour; past that we quietly say yes and store nothing,
// so a script learns nothing from the answer.
const SIGNUPS_PER_HOUR = 5;

async function visitorHash(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
  if (!ip) return null;
  return createHash("sha256").update(`block27-waitlist:${ip}`).digest("hex").slice(0, 32);
}

async function addToWaitlist(
  email: string,
  source: string,
): Promise<"ok" | "exists" | "error"> {
  const supabase = createAdminClient();
  const ipHash = await visitorHash();

  if (ipHash) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("waitlist")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if ((count ?? 0) >= SIGNUPS_PER_HOUR) return "exists";
  }

  const { error } = await supabase
    .from("waitlist")
    .insert({ email, source: normalizeSource(source), consent: true, ip_hash: ipHash });

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
