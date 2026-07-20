"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { USER_PHOTOS_BUCKET, basePhotoPath } from "@/lib/photos";

type Stage = "prep" | "live" | "review" | "saving";
type Facing = "user" | "environment";

const COACHING = [
  "Plain wall behind you.",
  "Face a window. No harsh shadows.",
  "Fitted clothes. Baggy hides the body.",
  "Whole body in frame. Head to shoes.",
];

export function BaseCapture({ userId }: { userId: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stage, setStage] = useState<Stage>("prep");
  const [facing, setFacing] = useState<Facing>("user");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(
    async (which: Facing) => {
      setError(null);
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: which,
            width: { ideal: 1080 },
            height: { ideal: 1920 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStage("live");
      } catch {
        setError("Camera blocked. Allow camera access, or upload a photo.");
        setStage("prep");
      }
    },
    [stopStream],
  );

  // Stop the camera whenever we leave the live view, and on unmount.
  useEffect(() => {
    if (stage !== "live") stopStream();
    return stopStream;
  }, [stage, stopStream]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (b) => {
        if (!b) {
          setError("Capture failed. Try again.");
          return;
        }
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setBlob(b);
        setPreviewUrl(URL.createObjectURL(b));
        setStage("review");
      },
      "image/jpeg",
      0.92,
    );
  }, [previewUrl]);

  const onFilePicked = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setBlob(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setStage("review");
    },
    [previewUrl],
  );

  const save = useCallback(async () => {
    if (!blob) return;
    setStage("saving");
    setError(null);
    const supabase = createClient();
    const { error: upErr } = await supabase.storage
      .from(USER_PHOTOS_BUCKET)
      .upload(basePhotoPath(userId), blob, {
        upsert: true,
        contentType: "image/jpeg",
      });

    if (upErr) {
      setError("Save failed. Check your connection and try again.");
      setStage("review");
      return;
    }
    router.replace("/wardrobe");
    router.refresh();
  }, [blob, userId, router]);

  return (
    <main className="flex flex-1 flex-col px-6 py-10 max-w-md w-full mx-auto">
      <p className="text-xs uppercase tracking-[0.08em] text-ash mb-2">
        Base photo
      </p>
      <h1 className="text-3xl font-semibold tracking-tight leading-[0.9] mb-8">
        Shoot your base.
      </h1>

      {stage === "prep" && (
        <div className="flex flex-col gap-8">
          <ul className="flex flex-col gap-3">
            {COACHING.map((line) => (
              <li key={line} className="flex gap-3 text-bone">
                <span aria-hidden className="text-ash">
                  —
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="text-ash text-sm">
            Every outfit is built on this one photo. Get it right once.
          </p>

          {error && <ErrorLine>{error}</ErrorLine>}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => startCamera(facing)}
              className="bg-paper text-void py-3 uppercase tracking-wide text-sm hover:bg-bone"
            >
              Open camera
            </button>

            <div className="flex flex-col gap-2 pt-2">
              <GalleryUpload onPick={onFilePicked} />
              <p className="text-ash text-xs">
                A friend can shoot it and send it over. Use a recent full-body
                photo — outfits render on your body as it is now, not an old one.
              </p>
            </div>
          </div>
        </div>
      )}

      {stage === "live" && (
        <div className="flex flex-col gap-4">
          <div className="relative w-full aspect-[3/4] bg-void overflow-hidden border border-iron">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={
                "h-full w-full object-cover " +
                (facing === "user" ? "-scale-x-100" : "")
              }
            />
            <SilhouetteGuide />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                setFacing((f) => {
                  const next = f === "user" ? "environment" : "user";
                  startCamera(next);
                  return next;
                })
              }
              className="text-xs uppercase tracking-[0.08em] text-ash hover:text-paper"
            >
              Flip
            </button>
            <button
              type="button"
              onClick={() => setStage("prep")}
              className="text-xs uppercase tracking-[0.08em] text-ash hover:text-paper"
            >
              Cancel
            </button>
          </div>

          <button
            type="button"
            onClick={capture}
            className="bg-paper text-void py-3 uppercase tracking-wide text-sm hover:bg-bone"
          >
            Take photo
          </button>
        </div>
      )}

      {(stage === "review" || stage === "saving") && previewUrl && (
        <div className="flex flex-col gap-4">
          <div className="w-full aspect-[3/4] bg-void overflow-hidden border border-iron">
            {/* Short-lived local object URL; next/image adds nothing here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Your base photo"
              className="h-full w-full object-cover"
            />
          </div>

          {error && <ErrorLine>{error}</ErrorLine>}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={save}
              disabled={stage === "saving"}
              className="bg-paper text-void py-3 uppercase tracking-wide text-sm hover:bg-bone disabled:opacity-50"
            >
              {stage === "saving" ? "Saving" : "Use this"}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStage("prep");
              }}
              disabled={stage === "saving"}
              className="border border-iron text-bone py-3 uppercase tracking-wide text-sm hover:border-paper hover:text-paper disabled:opacity-50"
            >
              Retake
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-blood text-sm border border-blood px-3 py-2">
      {children}
    </p>
  );
}

// Gallery picker. No `capture` attribute, so it opens the photo library rather
// than forcing the camera — this is the path for a photo a friend took and sent
// over. Same review + upload flow as a live capture.
function GalleryUpload({
  onPick,
}: {
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="border border-iron text-bone py-3 uppercase tracking-wide text-sm text-center cursor-pointer hover:border-paper hover:text-paper">
      Upload from gallery
      <input
        type="file"
        accept="image/*"
        onChange={onPick}
        className="hidden"
      />
    </label>
  );
}

// Framing guide: a clean, weighted standing figure the user fits inside,
// head to feet. Proper proportions (~8 heads tall), arms slightly away from the
// body, feet apart — it forces full body, correct distance, and centered
// framing. Round-capped limbs so it reads as a body, not a broken stick figure.
function SilhouetteGuide() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <svg
        viewBox="0 0 100 240"
        className="h-[92%] w-auto"
        aria-hidden
      >
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
