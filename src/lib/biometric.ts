import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { USER_PHOTOS_BUCKET, basePhotoPath } from "@/lib/photos";

// Biometric consent + retention. The base photo and its renders are biometric
// information; this module holds the consent gate the base-upload and render
// routes enforce, and the destruction used by the remove-base action and the
// inactivity retention job.

// --- Consent (BIPA / GDPR) -------------------------------------------------

// The current consent text version. Bump it whenever CONSENT_TEXT changes — a new
// version forces every user to consent again before the base photo or any render.
export const CONSENT_VERSION = "2026-09-22";

// The canonical consent text for CONSENT_VERSION — the single source of truth the
// app displays (served by GET /api/account/consent). Keep it, CONSENT_VERSION,
// and the privacy policy's retention section in lockstep.
export const CONSENT_TEXT = `BLOCK27 renders clothing onto a full-body photo of you (your "base photo"). Your base photo and the images generated from it are biometric information.

By agreeing you confirm that:
- You are 18 years of age or older.
- You consent to BLOCK27 collecting and processing your base photo and the generated try-on images to provide the virtual try-on.
- You understand your base photo and the garment images are sent to our rendering provider, FASHN, to generate the images.
- Your images are never sold and are never used to train AI models.
- Your base photo and renders are deleted when you remove your base photo, when you delete your account, and automatically after 12 months of inactivity.

You can withdraw this consent at any time by removing your base photo or deleting your account.`;

// True only when the user has recorded consent for the CURRENT version WITH the
// 18-or-older attestation. Enforcement refuses without it; a version bump makes
// every prior consent stop matching until the user consents again.
export async function hasBiometricConsent(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("biometric_consent")
    .select("id")
    .eq("user_id", userId)
    .eq("consent_version", CONSENT_VERSION)
    .eq("is_adult", true)
    .limit(1)
    .maybeSingle();
  return !!data;
}

// --- Activity + destruction ------------------------------------------------

// Best-effort last-activity bump for the inactivity retention job. Never throws;
// a missed bump only risks an earlier sweep, which the 12-month window makes
// harmless. Called from the core authenticated actions.
export async function touchLastActive(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) console.error("[biometric] last_active bump failed", error.message);
}

// Recursively collect every object path under a storage prefix. Storage.list is
// not recursive; a sub-folder comes back as an entry with a null id.
async function listAll(admin: SupabaseClient, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const { data } = await admin.storage
    .from(USER_PHOTOS_BUCKET)
    .list(prefix, { limit: 1000 });
  for (const entry of data ?? []) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id == null) out.push(...(await listAll(admin, path)));
    else out.push(path);
  }
  return out;
}

// Destroy a user's biometric artifacts — the base photo and every render (finals
// and tmp layers) — and null out the render pointers so nothing tries to show a
// deleted image. Admin client, scoped to the user's own folder. Idempotent and
// best-effort (a storage error is logged, not thrown), so a retention sweep or a
// remove-base tap always makes progress.
export async function purgeBiometricArtifacts(
  admin: SupabaseClient,
  userId: string,
): Promise<{ removed: number }> {
  const paths = [
    basePhotoPath(userId),
    ...(await listAll(admin, `${userId}/renders`)),
  ];

  let removed = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const { error } = await admin.storage.from(USER_PHOTOS_BUCKET).remove(batch);
    if (error) console.error("[biometric] remove failed", error.message);
    else removed += batch.length;
  }

  const { error: upErr } = await admin
    .from("outfits")
    .update({ render_path: null })
    .eq("user_id", userId)
    .not("render_path", "is", null);
  if (upErr) console.error("[biometric] render_path clear failed", upErr.message);

  return { removed };
}
