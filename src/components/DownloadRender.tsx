"use client";

import { useState } from "react";
import { btnNav } from "@/lib/ui";

// Downloads the render with a small BLOCK27 wordmark composited into the file.
// The on-screen image stays clean — the mark exists only in the downloaded copy.
// Bytes are fetched as a blob and drawn via createImageBitmap, so the canvas is
// never tainted and toBlob works.
export function DownloadRender({ outfitId }: { outfitId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const meta = await fetch(`/api/outfits/${outfitId}/download-url`);
      const mb = (await meta.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!meta.ok || !mb.url) {
        setError(mb.error || "Couldn't prepare the file.");
        return;
      }

      const res = await fetch(mb.url);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const bmp = await createImageBitmap(await res.blob());

      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Canvas unavailable.");
        return;
      }
      ctx.drawImage(bmp, 0, 0);

      // The wordmark: --paper at subtle opacity, heavy and tight, sitting in the
      // bottom-corner margin. Sized to the image so it reads at any resolution.
      const fs = Math.max(14, Math.round(bmp.width * 0.042));
      const pad = Math.round(bmp.width * 0.045);
      ctx.font = `900 ${fs}px ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif`;
      try {
        ctx.letterSpacing = "-0.02em";
      } catch {
        // older engines ignore letterSpacing
      }
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "rgba(242, 240, 236, 0.55)";
      const text = "BLOCK27";
      const w = ctx.measureText(text).width;
      ctx.fillText(text, canvas.width - w - pad, canvas.height - pad);

      const out = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.95),
      );
      if (!out) {
        setError("Couldn't build the file.");
        return;
      }

      const href = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = href;
      a.download = "block27-outfit.jpg";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={run} disabled={busy} className={btnNav}>
        {busy ? "Preparing." : "Download"}
      </button>
      {error ? <p className="text-bone text-sm">{error}</p> : null}
    </div>
  );
}
