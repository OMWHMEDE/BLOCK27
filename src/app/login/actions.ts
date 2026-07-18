"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function cleanCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function login(formData: FormData) {
  const { email, password } = cleanCredentials(formData);
  if (!email || !password) {
    redirect("/login?error=Enter+your+email+and+password");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/wardrobe");
}

export async function signup(formData: FormData) {
  const { email, password } = cleanCredentials(formData);
  if (!email || !password) {
    redirect("/signup?error=Enter+your+email+and+password");
  }

  const supabase = await createClient();
  // The users and style_profile rows are created by a Postgres trigger on
  // auth.users insert, so they land in the same transaction as the account.
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  // Email confirmation OFF (this build's intended setting): signUp returns a
  // session and the wardrobe loads immediately. If confirmation is ON there is
  // no session yet — say so plainly instead of bouncing to /login with no word,
  // which reads as a silent failure. Same branch also catches the enumeration-
  // protection case where an existing email returns success with no session.
  if (!data.session) {
    redirect(
      "/login?notice=" +
        encodeURIComponent(
          "Account created. Confirm it from the email we sent, then log in.",
        ),
    );
  }

  redirect("/wardrobe");
}
