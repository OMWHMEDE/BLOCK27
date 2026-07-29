"use client";

import { useState } from "react";

// A full-bleed image plate. Until the real try-on shot is dropped into
// /public/landing, it shows a premium placeholder — a single quiet "27" on void,
// the house mark — never lorem or stock. The real image is referenced by a fixed
// path, so dropping the file in (e.g. via the GitHub web UI) replaces the
// placeholder with no code change. object-cover, edge to edge, border-radius 0.
export function Plate({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [broken, setBroken] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-void ${className}`}>
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center"
      >
        <span className="font-mono text-2xl tracking-[0.24em] text-iron select-none">
          27
        </span>
      </div>
      {!broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          onError={() => setBroken(true)}
          className="relative z-[1] h-full w-full object-cover"
        />
      ) : null}
    </div>
  );
}
