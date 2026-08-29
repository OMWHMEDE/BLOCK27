"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { PhotoCapture } from "@/components/PhotoCapture";

const REQUIRED = [
  "Full body, head to shoes — both feet in frame",
  "Stand straight, facing the camera",
  "Fitted clothes — no baggy, puffy, or oversized items",
  "Plain background, even lighting",
  "Fully clothed and modest",
];
const WARNING =
  "Nude, revealing, or inappropriate photos are rejected and not stored. Repeated attempts get the account removed.";

// The base photo is the one-time ceremony — hold the branded screen so it lands,
// even on a fast network. Only here: garment uploads stay quick (you add them in
// batches), and this is a floor, not a delay — a slower upload just counts toward
// it. A failure skips the hold and shows the error at once.
const MIN_LOADING_MS = 2500;

export function BaseCapture() {
  const router = useRouter();

  const goToWardrobe = useCallback(() => {
    router.replace("/wardrobe");
    router.refresh();
  }, [router]);

  const onUse = useCallback(
    async (blob: Blob): Promise<string | null | { warn: string }> => {
      const started = Date.now();

      // Moderated server-side before storage. A rejected image is never stored;
      // the cold reason comes back for the capture screen to show. A stored image
      // may still carry a framing warning (legs out of frame) — advisory only.
      const form = new FormData();
      form.append("file", blob, "base.jpg");
      let body: { ok?: boolean; reason?: string; warning?: string };
      try {
        const res = await fetch("/api/photos/base", {
          method: "POST",
          body: form,
        });
        body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          reason?: string;
          warning?: string;
        };
      } catch {
        return "Couldn't reach the server. Try again.";
      }
      if (!body.ok) return body.reason || "Didn't save. Try again.";

      // Saved, but the framing is off. Surface the advisory and let the user
      // choose — no ceremony hold, since we're staying on the screen.
      if (body.warning) return { warn: body.warning };

      const remaining = MIN_LOADING_MS - (Date.now() - started);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      goToWardrobe();
      return null;
    },
    [goToWardrobe],
  );

  return (
    <PhotoCapture
      eyebrow="Base photo"
      title="Shoot your base."
      requirements={REQUIRED}
      warning={WARNING}
      exampleSrc="/examples/base-good.png"
      exampleLabel="A good base"
      intro="Every outfit is built on this one photo. Get it right once."
      previewAlt="Your base photo"
      defaultFacing="user"
      backHref="/settings"
      field
      galleryReminder="A friend can shoot it and send it over. Use a recent full-body photo — outfits render on your body as it is now, not an old one."
      onUse={onUse}
      onProceed={goToWardrobe}
    />
  );
}
