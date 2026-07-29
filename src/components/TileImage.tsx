"use client";

import { useEffect, useState } from "react";
import { Field27 } from "@/components/Field27";

// The tile's ground is the "27" field (see Field27), so a tile is never black:
// the field shows until the image fades in over it.

// URL reuse is the anti-reflash trick. Signed URLs rotate their token every time
// the server signs one, so a fresh URL is always a browser cache miss → the tile
// re-downloads and flashes. We remember the first URL we saw for a garment (its
// id, stable) and reuse it across mounts while it's fresh, so the browser serves
// the already-downloaded image. Only the URL string is stored — never a blob.
const URL_TTL_MS = 55 * 60 * 1000;

function stableUrl(cacheKey: string, incoming: string): string {
  try {
    const key = "b27:img:" + cacheKey;
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const c = JSON.parse(raw) as { url: string; at: number };
      if (c.url && Date.now() - c.at < URL_TTL_MS) return c.url;
    }
    sessionStorage.setItem(key, JSON.stringify({ url: incoming, at: Date.now() }));
  } catch {
    // sessionStorage unavailable — fall through to the incoming URL.
  }
  return incoming;
}

export function TileImage({
  cacheKey,
  url,
  alt,
}: {
  cacheKey: string;
  url: string | null;
  alt: string;
}) {
  const [src, setSrc] = useState<string | null>(url);
  const [loaded, setLoaded] = useState(false);

  // Resolve the stable URL on the client (sessionStorage isn't available during
  // SSR). If the resolved URL matches what already loaded, keep it opaque.
  useEffect(() => {
    // Resolve against sessionStorage after mount — it doesn't exist during SSR,
    // so this can't run in render without a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (url) setSrc(stableUrl(cacheKey, url));
  }, [cacheKey, url]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-void">
      <Field27 />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className={
            "relative h-full w-full object-cover transition-opacity duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none " +
            (loaded ? "opacity-100" : "opacity-0")
          }
        />
      ) : null}
    </div>
  );
}
