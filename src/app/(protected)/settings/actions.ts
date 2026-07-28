"use server";

import { createClient } from "@/lib/supabase/server";
import { USER_PHOTOS_BUCKET, avatarPath } from "@/lib/photos";

const MAX_AVATAR_BYTES = 8 * 1024 * 1024; // 8 MB

type Result = { ok: boolean; error?: string; notice?: string };

// Display name + optional avatar. Both scoped to the caller by RLS.
export async function saveProfile(formData: FormData): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again." };

  const displayName = String(formData.get("display_name") ?? "")
    .trim()
    .slice(0, 40);

  const { error: upErr } = await supabase
    .from("users")
    .update({ display_name: displayName || null })
    .eq("id", user.id);
  if (upErr) return { ok: false, error: upErr.message };

  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    if (avatar.size > MAX_AVATAR_BYTES) {
      return { ok: false, error: "Image too large. Keep it under 8MB." };
    }
    if (!avatar.type.startsWith("image/")) {
      return { ok: false, error: "That's not an image." };
    }
    const { error: avErr } = await supabase.storage
      .from(USER_PHOTOS_BUCKET)
      .upload(avatarPath(user.id), avatar, {
        upsert: true,
        contentType: avatar.type,
      });
    if (avErr) return { ok: false, error: avErr.message };
  }

  return { ok: true, notice: "Saved." };
}

export async function updateEmail(formData: FormData): Promise<Result> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { ok: false, error: "Enter an email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { ok: false, error: error.message };

  return { ok: true, notice: "Confirm the change from the new address." };
}

export async function updatePassword(formData: FormData): Promise<Result> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { ok: false, error: "At least 8 characters." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: error.message };

  return { ok: true, notice: "Password changed." };
}
