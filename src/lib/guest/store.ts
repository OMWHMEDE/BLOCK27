import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { USER_PHOTOS_BUCKET } from "@/lib/photos";
import type { GarmentAnalysis } from "@/lib/brain/types";
import type { ModerationMedia } from "@/lib/moderation/types";

// Guest data access — service-role only. Guests aren't authenticated, so the
// anon/user keys can't touch guest_garments/guest_generations (RLS on, no
// policies). Every read and write here goes through the admin client, scoped by
// the guest id from the cookie. Images live under a guests/ prefix in the same
// private bucket; there are no public object URLs, same as everything else.

export const GUEST_PIECE_LIMIT = 3; // pieces one guest can pull before signup
const GUEST_PREFIX = "guests";

// Coarse per-IP rate limits over a rolling window — the per-guest caps (3 pieces
// via count, 1 generation via a unique row) are the real guards; these just stop
// one address from spinning up many guest sessions.
const IP_WINDOW_MS = 60 * 60 * 1000; // 1h
const IP_UPLOAD_MAX = 20;
const IP_GENERATE_MAX = 8;

const EXT: Record<ModerationMedia, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function guestGarmentPath(
  guestId: string,
  id: string,
  mediaType: ModerationMedia,
): string {
  return `${GUEST_PREFIX}/${guestId}/${id}.${EXT[mediaType] ?? "jpg"}`;
}

export type GuestGarmentRow = {
  id: string;
  photo_path: string;
  media_type: string;
  analysis: GarmentAnalysis;
  descriptor: string | null;
};

export async function countGuestGarments(guestId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("guest_garments")
    .select("id", { count: "exact", head: true })
    .eq("guest_id", guestId);
  return count ?? 0;
}

export async function listGuestGarments(
  guestId: string,
): Promise<GuestGarmentRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("guest_garments")
    .select("id, photo_path, media_type, analysis, descriptor")
    .eq("guest_id", guestId)
    .order("created_at", { ascending: true });
  return (data ?? []) as GuestGarmentRow[];
}

// Signed thumbnails for a guest's pieces — service-role, short-lived, private.
export async function signGuestThumbs(
  paths: string[],
  seconds = 300,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(USER_PHOTOS_BUCKET)
    .createSignedUrls(paths, seconds);
  for (const s of data ?? []) {
    if (s.path && s.signedUrl) map.set(s.path, s.signedUrl);
  }
  return map;
}

export async function putGuestObject(
  path: string,
  bytes: Buffer,
  contentType: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(USER_PHOTOS_BUCKET)
    .upload(path, bytes, { upsert: false, contentType, cacheControl: "3600" });
  return !error;
}

export async function insertGuestGarment(input: {
  guestId: string;
  ip: string | null;
  path: string;
  mediaType: string;
  analysis: GarmentAnalysis;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("guest_garments").insert({
    guest_id: input.guestId,
    ip: input.ip,
    photo_path: input.path,
    media_type: input.mediaType,
    analysis: input.analysis,
    descriptor: input.analysis.descriptor ?? null,
  });
}

export type GuestOutfit = { item_ids: string[]; reasoning: string };

export async function getGeneration(
  guestId: string,
): Promise<{ outfits: GuestOutfit[]; occasion: string | null } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("guest_generations")
    .select("outfits, occasion")
    .eq("guest_id", guestId)
    .maybeSingle();
  if (!data) return null;
  return {
    outfits: (data.outfits as GuestOutfit[]) ?? [],
    occasion: (data.occasion as string | null) ?? null,
  };
}

// Save the one composition. Returns false if a row already exists (the unique
// guest_id makes the single-shot rule atomic — two racing calls, one wins).
export async function saveGeneration(input: {
  guestId: string;
  ip: string | null;
  outfits: GuestOutfit[];
  occasion: string;
}): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("guest_generations").insert({
    guest_id: input.guestId,
    ip: input.ip,
    outfits: input.outfits,
    occasion: input.occasion || null,
  });
  return !error;
}

async function countByIpSince(
  table: "guest_garments" | "guest_generations",
  ip: string | null,
): Promise<number> {
  if (!ip) return 0;
  const admin = createAdminClient();
  const since = new Date(Date.now() - IP_WINDOW_MS).toISOString();
  const { count } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .gte("created_at", since);
  return count ?? 0;
}

export async function ipUploadsExceeded(ip: string | null): Promise<boolean> {
  return (await countByIpSince("guest_garments", ip)) >= IP_UPLOAD_MAX;
}

export async function ipGenerationsExceeded(ip: string | null): Promise<boolean> {
  return (await countByIpSince("guest_generations", ip)) >= IP_GENERATE_MAX;
}

// Purge everything older than the cutoff — storage objects first, then rows.
// Returns counts for the cron log. Deletes never fail the caller; this runs on a
// schedule and best-effort is correct.
export async function purgeExpiredGuests(
  cutoffIso: string,
): Promise<{ objects: number; garments: number; generations: number }> {
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("guest_garments")
    .select("id, photo_path")
    .lt("created_at", cutoffIso);

  const paths = (rows ?? []).map((r) => r.photo_path as string);
  if (paths.length > 0) {
    await admin.storage.from(USER_PHOTOS_BUCKET).remove(paths);
  }

  const { count: garments } = await admin
    .from("guest_garments")
    .delete({ count: "exact" })
    .lt("created_at", cutoffIso);

  const { count: generations } = await admin
    .from("guest_generations")
    .delete({ count: "exact" })
    .lt("created_at", cutoffIso);

  return {
    objects: paths.length,
    garments: garments ?? 0,
    generations: generations ?? 0,
  };
}

// First forwarded address, or null. Used only for coarse rate limiting.
export function ipFrom(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip");
}
