"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

// Where the emailed reset link comes back to. Derived from the request so it
// works on both www and apex (both are in Supabase's redirect allowlist); falls
// back to the production host if no origin header is present.
async function resetRedirectUrl(): Promise<string> {
  const h = await headers();
  const origin =
    h.get("origin") ??
    (() => {
      const host = h.get("x-forwarded-host") ?? h.get("host");
      return host ? `https://${host}` : "https://www.block27.app";
    })();
  return `${origin}/reset/confirm`;
}

// Step 1: request a reset link. NEVER reveals whether an email has an account —
// it always ends on the same neutral "if it exists, a link is on its way"
// screen, whether the email is registered, unregistered, or malformed. Supabase
// rate-limits this endpoint server-side, so repeats can't be used to spam or to
// probe. The real Supabase error (if any) is logged, never shown.
export async function requestReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect("/reset?error=Enter+your+email");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await resetRedirectUrl(),
  });
  if (error) console.error("[reset] resetPasswordForEmail:", error.message);

  // Same destination regardless of outcome — no account enumeration.
  redirect("/reset?sent=1");
}

// Step 3: set the new password. Runs with the recovery session established by
// /reset/confirm, so updateUser is authorized. On success we sign out and send
// them to log in fresh with the new password.
export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    redirect("/reset/new?error=Password+must+be+at+least+8+characters");
  }
  if (password !== confirm) {
    redirect("/reset/new?error=Passwords+don%27t+match");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // No recovery session — the link expired or was never exchanged.
    redirect("/reset?error=" + encodeURIComponent("This link expired. Request a new one."));
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect("/reset/new?error=" + encodeURIComponent(error.message));
  }

  // Force a clean login with the new password.
  await supabase.auth.signOut();
  redirect("/login?notice=" + encodeURIComponent("Password updated. Log in."));
}
