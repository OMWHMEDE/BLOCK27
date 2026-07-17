import { createClient } from "@/lib/supabase/server";

// The private bucket that holds every user photo. There is no public bucket.
export const USER_PHOTOS_BUCKET = "user-photos";

/**
 * The ONLY way anything is allowed to read from the user-photos bucket.
 *
 * The bucket is private. There are no public object URLs — a public URL to
 * body photography is a permanent liability. Access is always a signed URL
 * that expires. Default 300 seconds: long enough to load an image, short
 * enough that a leaked link is worthless minutes later.
 *
 * Runs as the logged-in user (anon key + their cookies), so RLS on the
 * bucket still applies — a user can only sign URLs for their own objects.
 */
export async function signedUrl(
  path: string,
  seconds = 300,
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(USER_PHOTOS_BUCKET)
    .createSignedUrl(path, seconds);

  if (error || !data) return null;
  return data.signedUrl;
}
