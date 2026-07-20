"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { USER_PHOTOS_BUCKET, basePhotoPath } from "@/lib/photos";
import { PhotoCapture } from "@/components/PhotoCapture";

const COACHING = [
  "Plain wall behind you.",
  "Face a window. No harsh shadows.",
  "Fitted clothes. Baggy hides the body.",
  "Whole body in frame. Head to shoes.",
];

export function BaseCapture({ userId }: { userId: string }) {
  const router = useRouter();

  const onUse = useCallback(
    async (blob: Blob): Promise<string | null> => {
      const supabase = createClient();
      const { error } = await supabase.storage
        .from(USER_PHOTOS_BUCKET)
        .upload(basePhotoPath(userId), blob, {
          upsert: true,
          contentType: "image/jpeg",
        });
      if (error) return "Save failed. Check your connection and try again.";
      router.replace("/wardrobe");
      router.refresh();
      return null;
    },
    [userId, router],
  );

  return (
    <PhotoCapture
      eyebrow="Base photo"
      title="Shoot your base."
      coaching={COACHING}
      intro="Every outfit is built on this one photo. Get it right once."
      guide={<SilhouetteGuide />}
      previewAlt="Your base photo"
      defaultFacing="user"
      galleryReminder="A friend can shoot it and send it over. Use a recent full-body photo — outfits render on your body as it is now, not an old one."
      onUse={onUse}
    />
  );
}

// Framing guide: a clean, weighted standing figure the user fits inside,
// head to feet. Proper proportions (~8 heads tall), arms slightly away from the
// body, feet apart — it forces full body, correct distance, and centered
// framing. Round-capped limbs so it reads as a body, not a broken stick figure.
function SilhouetteGuide() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <svg viewBox="0 0 100 240" className="h-[92%] w-auto" aria-hidden>
        <g
          opacity="0.34"
          fill="var(--color-paper)"
          stroke="var(--color-paper)"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* head */}
          <circle cx="50" cy="26" r="15" stroke="none" />
          {/* neck + torso */}
          <line x1="50" y1="41" x2="50" y2="50" strokeWidth="10" />
          <line x1="30" y1="55" x2="70" y2="55" strokeWidth="12" />
          <line x1="50" y1="53" x2="50" y2="120" strokeWidth="16" />
          {/* arms, slightly away from the body */}
          <line x1="32" y1="58" x2="24" y2="118" strokeWidth="10" />
          <line x1="68" y1="58" x2="76" y2="118" strokeWidth="10" />
          {/* legs, feet apart */}
          <line x1="43" y1="122" x2="40" y2="232" strokeWidth="13" />
          <line x1="57" y1="122" x2="60" y2="232" strokeWidth="13" />
          {/* feet */}
          <line x1="40" y1="232" x2="31" y2="235" strokeWidth="9" />
          <line x1="60" y1="232" x2="69" y2="235" strokeWidth="9" />
        </g>
      </svg>
    </div>
  );
}
