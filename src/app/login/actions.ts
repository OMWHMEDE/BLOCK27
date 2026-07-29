"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { USER_PHOTOS_BUCKET, avatarPath } from "@/lib/photos";
import { migrateGuestToUser } from "@/lib/guest/migrate";

const MAX_AVATAR_BYTES = 8 * 1024 * 1024; // 8 MB

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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  // Carry any guest pieces into the account they just signed into. Best-effort,
  // never blocks — a guest who signs in keeps the work they did anonymously.
  if (data.user) await migrateGuestToUser(data.user.id);

  redirect("/wardrobe");
}

export async function signup(formData: FormData) {
  const { email, password } = cleanCredentials(formData);
  if (!email || !password) {
    redirect("/signup?error=Enter+your+email+and+password");
  }

  const displayName = String(formData.get("display_name") ?? "")
    .trim()
    .slice(0, 40);
  const avatar = formData.get("avatar");

  const supabase = await createClient();
  // display_name rides in the auth metadata; the handle_new_user trigger reads
  // it and writes public.users.display_name in the same transaction as the row.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: displayName ? { data: { display_name: displayName } } : undefined,
  });

  if (error) {
    redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  // Email confirmation OFF (this build's intended setting): signUp returns a
  // session and the wardrobe loads immediately. If confirmation is ON there is
  // no session yet — say so plainly instead of bouncing to /login with no word,
  // which reads as a silent failure. Same branch also catches the enumeration-
  // protection case where an existing email returns success with no session.
  if (!data.session || !data.user) {
    redirect(
      "/login?notice=" +
        encodeURIComponent(
          "Account created. Confirm it from the email we sent, then log in.",
        ),
    );
  }

  // Optional avatar. The session now exists, so this runs as the owner and RLS
  // allows their own path. Best-effort: a failed or oversized avatar never fails
  // signup — it can always be set later in Settings.
  if (
    avatar instanceof File &&
    avatar.size > 0 &&
    avatar.size <= MAX_AVATAR_BYTES &&
    avatar.type.startsWith("image/")
  ) {
    await supabase.storage
      .from(USER_PHOTOS_BUCKET)
      .upload(avatarPath(data.user.id), avatar, {
        upsert: true,
        contentType: avatar.type,
      });
  }

  // Carry any guest pieces into the new account. Best-effort, never blocks.
  await migrateGuestToUser(data.user.id);

  redirect("/wardrobe");
}
