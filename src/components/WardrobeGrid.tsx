"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { GarmentThumb } from "@/lib/supabase/storage";
import { TileImage } from "@/components/TileImage";
import { btnNav } from "@/lib/ui";
import { onQueueChange, queueSize } from "@/lib/uploadQueue";

// The wardrobe grid, client-side and cache-first. On return it paints from the
// session cache instantly — no server round-trip, no refetch-and-reflash — then
// revalidates in the background. Only metadata + signed-URL strings are cached,
// never image bytes; the browser HTTP-caches the images themselves.
const CACHE_KEY = "b27:wardrobe:v1";
const CACHE_TTL_MS = 55 * 60 * 1000;

function readCache(): GarmentThumb[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as { garments: GarmentThumb[]; at: number };
    return Date.now() - c.at > CACHE_TTL_MS ? null : c.garments;
  } catch {
    return null;
  }
}

function writeCache(garments: GarmentThumb[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ garments, at: Date.now() }));
  } catch {
    // sessionStorage unavailable — the grid just won't persist this session.
  }
}

export function WardrobeGrid() {
  const [garments, setGarments] = useState<GarmentThumb[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const triggered = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to the module-scoped upload queue (0 on the server).
  const uploading = useSyncExternalStore(onQueueChange, queueSize, () => 0);

  const analyze = useCallback(async (id: string) => {
    try {
      const res = await fetch("/api/garments/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ garmentId: id }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setError(b.error || `Analysis failed (${res.status}).`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis request failed.");
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/wardrobe");
      if (!res.ok) return;
      const b = (await res.json().catch(() => ({}))) as {
        garments?: GarmentThumb[];
      };
      const list = b.garments ?? [];
      setGarments(list);
      writeCache(list);
      for (const g of list) {
        if (g.status === "pending" && !triggered.current.has(g.id)) {
          triggered.current.add(g.id);
          void analyze(g.id);
        }
      }
    } catch {
      // Network blip — keep showing the cache.
    }
  }, [analyze]);

  useEffect(() => {
    // Cache-first paint from sessionStorage (browser-only), then revalidate.
    const cached = readCache();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cached) setGarments(cached);
    void load();
  }, [load]);

  const active =
    (garments ?? []).some(
      (g) => g.status === "pending" || g.status === "analyzing",
    ) || uploading > 0;

  useEffect(() => {
    if (!active) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(() => void load(), 3000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [active, load]);

  const retry = useCallback(() => {
    triggered.current.clear();
    setError(null);
    void load();
  }, [load]);

  const count = garments?.length ?? 0;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-6">
        <p className="text-xs uppercase tracking-[0.08em] text-ash">
          Pieces{" "}
          <span className="text-iron font-mono">
            {String(count).padStart(2, "0")}
          </span>
          {uploading > 0 ? (
            <span className="ml-3 text-bone">Uploading {uploading}</span>
          ) : null}
        </p>
        <Link href="/garments/new" className={btnNav}>
          Add
        </Link>
      </div>

      {error ? (
        <div className="border border-blood px-4 py-3 mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-blood text-sm uppercase tracking-[0.08em]">
              Analysis failed
            </p>
            <p className="text-ash text-sm mt-1 break-words">{error}</p>
          </div>
          <button type="button" onClick={retry} className={`${btnNav} shrink-0`}>
            Retry
          </button>
        </div>
      ) : null}

      {garments === null ? (
        <ul className="grid grid-cols-3 gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i}>
              <div className="aspect-[3/4] border border-iron">
                <TileImage cacheKey={`ph-${i}`} url={null} alt="" />
              </div>
            </li>
          ))}
        </ul>
      ) : garments.length === 0 && uploading === 0 ? (
        <p className="text-ash max-w-md">
          Empty. Shoot five pieces and I&rsquo;ll start putting outfits together.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-1">
          {garments.map((g) => (
            <GarmentTile key={g.id} garment={g} />
          ))}
        </ul>
      )}
    </section>
  );
}

function GarmentTile({ garment }: { garment: GarmentThumb }) {
  const { id, status, url, analysis } = garment;
  const rejected = status === "rejected";
  const analyzed = status === "analyzed" && analysis;

  return (
    <li>
      <Link href={`/garments/${id}`} className="group block">
        <div
          className={
            "aspect-[3/4] border border-iron group-hover:border-paper " +
            (rejected ? "opacity-40" : "")
          }
        >
          <TileImage
            cacheKey={id}
            url={url}
            alt={analyzed ? analysis.descriptor : "Garment"}
          />
        </div>
        <p className="text-ash text-xs mt-1 truncate">
          {analyzed ? analysis.descriptor : rejected ? "Won't read" : "Reading…"}
        </p>
      </Link>
    </li>
  );
}
