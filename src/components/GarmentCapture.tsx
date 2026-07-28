"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { PhotoCapture } from "@/components/PhotoCapture";
import { enqueueGarmentUpload } from "@/lib/uploadQueue";

const DOS = ["Laid flat", "Plain surface", "Whole item in frame"];
const DONTS = ["On a hanger", "Wrinkled", "Half in frame"];

export function GarmentCapture({ userId }: { userId: string }) {
  const router = useRouter();

  const onUse = useCallback(
    async (blob: Blob): Promise<string | null> => {
      // The upload runs in the module-scoped queue, so it survives leaving this
      // screen and never restarts from zero.
      const err = await enqueueGarmentUpload(blob, userId);
      if (err) return err;

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
      dos={DOS}
      donts={DONTS}
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
