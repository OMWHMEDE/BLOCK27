"use client";

import { createClient } from "@/lib/supabase/client";
import { USER_PHOTOS_BUCKET, garmentPhotoPath } from "@/lib/photos";

// Garment uploads run here, at module scope, so leaving the capture screen does
// not abort them — an in-flight upload stays queued and finishes instead of
// restarting from zero. The photo blob lives only in memory for the life of the
// upload; nothing is written to persistent storage (privacy — no garment blobs
// on disk). A subscriber (the wardrobe grid) shows how many are still going.

type Listener = () => void;
const listeners = new Set<Listener>();
let active = 0;

export function queueSize(): number {
  return active;
}

export function onQueueChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify() {
  for (const fn of listeners) fn();
}

// Uploads one garment and records its row. Returns an error string to show, or
// null on success. cacheControl lets the browser reuse the image after upload.
export async function enqueueGarmentUpload(
  file: Blob,
  userId: string,
): Promise<string | null> {
  active += 1;
  notify();
  try {
    const supabase = createClient();
    const garmentId = crypto.randomUUID();
    const path = garmentPhotoPath(userId, garmentId);

    const { error: upErr } = await supabase.storage
      .from(USER_PHOTOS_BUCKET)
      .upload(path, file, {
        upsert: false,
        contentType: "image/jpeg",
        cacheControl: "3600",
      });
    if (upErr) return "Didn't save. Check your connection.";

    const { error: insErr } = await supabase.from("garments").insert({
      id: garmentId,
      user_id: userId,
      photo_path: path,
      status: "pending",
    });
    if (insErr) {
      await supabase.storage.from(USER_PHOTOS_BUCKET).remove([path]);
      return "Didn't save. Check your connection.";
    }

    return null;
  } finally {
    active -= 1;
    notify();
  }
}
