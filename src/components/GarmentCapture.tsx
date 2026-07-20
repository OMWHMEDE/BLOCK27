"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { USER_PHOTOS_BUCKET, garmentPhotoPath } from "@/lib/photos";
import { PhotoCapture } from "@/components/PhotoCapture";

const COACHING = [
  "Lay it flat. Bed, floor, or a clean surface.",
  "Plain surface. Nothing else in the shot.",
  "Even light. No shadow across the fabric.",
  "Whole item in frame. One item at a time.",
];

export function GarmentCapture({ userId }: { userId: string }) {
  const router = useRouter();

  const onUse = useCallback(
    async (blob: Blob): Promise<string | null> => {
      const supabase = createClient();
      const garmentId = crypto.randomUUID();
      const path = garmentPhotoPath(userId, garmentId);

      // Upload the image first, then record the row. If the row insert fails,
      // remove the orphaned object so storage never drifts from the table.
      const { error: upErr } = await supabase.storage
        .from(USER_PHOTOS_BUCKET)
        .upload(path, blob, { upsert: false, contentType: "image/jpeg" });
      if (upErr) return "Save failed. Check your connection and try again.";

      const { error: insErr } = await supabase.from("garments").insert({
        id: garmentId,
        user_id: userId,
        photo_path: path,
        status: "pending",
      });
      if (insErr) {
        await supabase.storage.from(USER_PHOTOS_BUCKET).remove([path]);
        return "Save failed. Check your connection and try again.";
      }

      router.replace("/wardrobe");
      router.refresh();
      return null;
    },
    [userId, router],
  );

  return (
    <PhotoCapture
      eyebrow="Add a garment"
      title="Shoot the item."
      coaching={COACHING}
      intro="One item, laid flat. This is what the brain reads later."
      guide={<GarmentGuide />}
      previewAlt="Garment photo"
      defaultFacing="environment"
      galleryReminder="A flat, top-down shot works best. No hanger, no body."
      onUse={onUse}
    />
  );
}

// Framing guide for a flat-lay: four corner brackets. The item goes inside them,
// fully in frame. Square corners, on brand.
function GarmentGuide() {
  const arm = "absolute w-6 h-6 border-paper/40";
  return (
    <div className="pointer-events-none absolute inset-6">
      <span className={`${arm} top-0 left-0 border-t-2 border-l-2`} />
      <span className={`${arm} top-0 right-0 border-t-2 border-r-2`} />
      <span className={`${arm} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${arm} bottom-0 right-0 border-b-2 border-r-2`} />
    </div>
  );
}
