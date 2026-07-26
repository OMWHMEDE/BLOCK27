"use client";

import { useState } from "react";

// The payoff, rendered as a reveal. The image fades in slowly on load — tied to
// the actual pixels, so it never half-loads and pops — while two thin paper
// lines draw in across the top and bottom, framing it. No glow, shadow, or
// gradient: motion and the drawn frame carry the moment.
export function RenderHero({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  const line =
    "block h-px bg-paper origin-center transition-transform duration-700 ease-out motion-reduce:transition-none " +
    (loaded ? "scale-x-100" : "scale-x-0");

  return (
    <figure className="mx-auto w-full max-w-lg">
      <span aria-hidden className={line} />
      <div className="aspect-[3/4] bg-void overflow-hidden border-x border-iron">
        {/* Private render via a signed URL; next/image adds nothing here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={
            "h-full w-full object-cover transition-opacity duration-[1400ms] ease-out motion-reduce:transition-none motion-reduce:opacity-100 " +
            (loaded ? "opacity-100" : "opacity-0")
          }
        />
      </div>
      <span aria-hidden className={`${line} delay-200`} />
    </figure>
  );
}
