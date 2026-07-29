import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { USER_PHOTOS_BUCKET, garmentPhotoPath } from "@/lib/photos";
import { readGuestId, clearGuestId } from "@/lib/guest/cookie";
import { FREE_PIECE_LIMIT } from "@/lib/plan";

// On signup, carry the guest's pieces into the new account so they land already
// stocked (at 3/15) rather than starting empty. The guest images and analyses
// already exist — this copies them under the user's own storage path and inserts
// analyzed garment rows, then deletes the guest data and cookie.
//
// It NEVER throws. Migration is a nicety, not a guarantee: if anything fails,
// the account is still fine and the visitor re-pulls at most three pieces. A
// failed conversion must never break signup.
export async function migrateGuestToUser(userId: string): Promise<void> {
  try {
    const guestId = await readGuestId();
    if (!guestId) return;

    const admin = createAdminClient();
    const { data: rows } = await admin
      .from("guest_garments")
      .select("id, photo_path, media_type, analysis")
      .eq("guest_id", guestId)
      .order("created_at", { ascending: true })
      .limit(FREE_PIECE_LIMIT);

    for (const r of rows ?? []) {
      const garmentId = crypto.randomUUID();
      const dest = garmentPhotoPath(userId, garmentId);

      const { data: file } = await admin.storage
        .from(USER_PHOTOS_BUCKET)
        .download(r.photo_path as string);
      if (!file) continue;

      const bytes = Buffer.from(await file.arrayBuffer());
      const { error: upErr } = await admin.storage
        .from(USER_PHOTOS_BUCKET)
        .upload(dest, bytes, {
          upsert: true,
          contentType: (r.media_type as string) || "image/jpeg",
        });
      if (upErr) continue;

      // Analysis already ran as a guest — land it analyzed so it counts and can
      // be styled immediately, no second vision call.
      await admin.from("garments").insert({
        id: garmentId,
        user_id: userId,
        photo_path: dest,
        status: "analyzed",
        analysis: r.analysis,
      });
    }

    // Tidy up the anonymous data now that it has moved.
    const paths = (rows ?? []).map((r) => r.photo_path as string);
    if (paths.length > 0) {
      await admin.storage.from(USER_PHOTOS_BUCKET).remove(paths);
    }
    await admin.from("guest_garments").delete().eq("guest_id", guestId);
    await admin.from("guest_generations").delete().eq("guest_id", guestId);
    await clearGuestId();
  } catch (e) {
    console.warn(
      "[guest] migration skipped",
      e instanceof Error ? e.message : "",
    );
  }
}
