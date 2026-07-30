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
  objectClass = "object-center",
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
  // object-position, per section. Default center; pass e.g. "object-top" when a
  // taller crop would otherwise cut a face/head off.
  objectClass?: string;
}) {
  const [broken, setBroken] = useState(false);

  // The container's size comes entirely from `className` (aspect ratio + width).
  // Both the placeholder and the image are ABSOLUTELY positioned to fill it, so
  // the box never collapses to the image's intrinsic size — the image covers the
  // full section edge to edge and object-cover crops whatever the real photo's
  // dimensions happen to be. (An in-flow image with h-full resolves its height
  // to auto against an aspect-ratio parent, which is what boxed it before.)
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
          className={`absolute inset-0 z-[1] h-full w-full object-cover ${objectClass}`}
        />
      ) : null}
    </div>
  );
}
