"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Stage = "prep" | "live" | "review" | "saving";
type Facing = "user" | "environment";

export type PhotoCaptureProps = {
  eyebrow: string;
  title: string;
  coaching: string[];
  intro?: string;
  guide: React.ReactNode;
  previewAlt: string;
  defaultFacing?: Facing;
  galleryReminder?: string;
  // Persist the captured image. Return an error string to show and stay on the
  // review step, or null on success — in which case the caller is responsible
  // for navigating away.
  onUse: (blob: Blob) => Promise<string | null>;
};

// Shared capture flow: live camera with a framing guide, gallery upload,
// review, retake. It owns none of the storage logic — that lives in onUse — so
// base photos and garments share exactly one camera implementation.
export function PhotoCapture({
  eyebrow,
  title,
  coaching,
  intro,
  guide,
  previewAlt,
  defaultFacing = "user",
  galleryReminder,
  onUse,
}: PhotoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stage, setStage] = useState<Stage>("prep");
  const [facing, setFacing] = useState<Facing>(defaultFacing);
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

  const showPreview = useCallback(
    (b: Blob) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setBlob(b);
      setPreviewUrl(URL.createObjectURL(b));
      setError(null);
      setStage("review");
    },
    [previewUrl],
  );

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
        showPreview(b);
      },
      "image/jpeg",
      0.92,
    );
  }, [showPreview]);

  const onFilePicked = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) showPreview(file);
      e.target.value = "";
    },
    [showPreview],
  );

  const save = useCallback(async () => {
    if (!blob) return;
    setStage("saving");
    setError(null);
    const err = await onUse(blob);
    if (err) {
      setError(err);
      setStage("review");
    }
    // On success onUse navigates away; leave the button disabled until it does.
  }, [blob, onUse]);

  return (
    <main className="flex flex-1 flex-col px-6 py-10 max-w-md w-full mx-auto">
      <p className="text-xs uppercase tracking-[0.08em] text-ash mb-2">
        {eyebrow}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight leading-[0.9] mb-8">
        {title}
      </h1>

      {stage === "prep" && (
        <div className="flex flex-col gap-8">
          <ul className="flex flex-col gap-3">
            {coaching.map((line) => (
              <li key={line} className="flex gap-3 text-bone">
                <span aria-hidden className="text-ash">
                  —
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          {intro && <p className="text-ash text-sm">{intro}</p>}

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
              {galleryReminder && (
                <p className="text-ash text-xs">{galleryReminder}</p>
              )}
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
            {guide}
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
              alt={previewAlt}
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

export function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-blood text-sm border border-blood px-3 py-2">
      {children}
    </p>
  );
}

// Gallery picker. No `capture` attribute, so it opens the photo library rather
// than forcing the camera — the path for a photo taken elsewhere and sent over.
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
