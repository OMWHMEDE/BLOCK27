import { createClient } from "@/lib/supabase/server";
import { USER_PHOTOS_BUCKET, basePhotoPath } from "@/lib/photos";
import type { GarmentAnalysis } from "@/lib/brain/types";

export { USER_PHOTOS_BUCKET };

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
 * Returns null when the object does not exist or the user cannot read it.
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

/**
 * Signed URL for a user's base photo, or null if they don't have one yet.
 * Doubles as the existence check — createSignedUrl errors on a missing object,
 * so a null return means "no base captured".
 */
export async function getBasePhotoUrl(
  userId: string,
  seconds = 300,
): Promise<string | null> {
  return signedUrl(basePhotoPath(userId), seconds);
}

export type GarmentThumb = {
  id: string;
  status: string;
  url: string | null;
  analysis: GarmentAnalysis | null;
  reject_reason: string | null;
};

/**
 * The user's garments, newest first, each with a 300s signed thumbnail URL and
 * its analysis (once the brain has written it). RLS scopes the rows to the user;
 * the whole batch is signed in one call.
 */
export async function listGarmentThumbs(
  userId: string,
  seconds = 300,
): Promise<GarmentThumb[]> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("garments")
    .select("id, photo_path, status, analysis, reject_reason")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !rows || rows.length === 0) return [];

  const { data: signed } = await supabase.storage
    .from(USER_PHOTOS_BUCKET)
    .createSignedUrls(
      rows.map((r) => r.photo_path),
      seconds,
    );

  const urlByPath = new Map(
    (signed ?? []).map((s) => [s.path, s.signedUrl] as const),
  );

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    url: urlByPath.get(r.photo_path) ?? null,
    analysis: (r.analysis as GarmentAnalysis | null) ?? null,
    reject_reason: (r.reject_reason as string | null) ?? null,
  }));
}
