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

// Analysis is PENDING-DRIVEN, not upload-callback-driven. Whatever created the
// rows — one at a time or a batch — the driver finds every 'pending' row and
// works through them at low fixed concurrency (never a parallel storm). It is
// idempotent (the endpoint claims each row, so nothing is analyzed twice),
// resumable (a pending row left mid-flight is picked up on the next poll or on
// return), and it never leaves a row stuck: a row that keeps failing is marked
// failed with a retry, and a row stranded in 'analyzing' by a killed function is
// reclaimed once it's provably dead.
const POLL_MS = 3000;
const CONCURRENCY = 2;
const MAX_ATTEMPTS = 3;
// A live analysis has a 45s vision timeout inside a 60s function. Only reclaim a
// row we've watched sit in 'analyzing' longer than that — by then any real call
// has already finished or reverted the row to 'pending', so a reclaim can never
// race a live one into a double charge.
const RECLAIM_AFTER_MS = 50_000;

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

export function WardrobeGrid({ grouped = false }: { grouped?: boolean } = {}) {
  const [garments, setGarments] = useState<GarmentThumb[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  // Bumped each time a worker finishes, to re-run the driver and refill slots.
  const [drainTick, setDrainTick] = useState(0);

  // Driver bookkeeping — refs so it survives polls without re-rendering.
  // inFlight: ids being analyzed right now. attempts: per-id failure count.
  // settled: ids the endpoint has resolved (bridges the gap until the next poll
  // shows analyzed/rejected). analyzingSince: first time a row was seen in
  // 'analyzing', for the reclaim window.
  const inFlight = useRef<Set<string>>(new Set());
  const attempts = useRef<Map<string, number>>(new Map());
  const settled = useRef<Set<string>>(new Set());
  const analyzingSince = useRef<Map<string, number>>(new Map());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Subscribe to the module-scoped upload queue (0 on the server).
  const uploading = useSyncExternalStore(onQueueChange, queueSize, () => 0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/wardrobe");
      if (!res.ok) return;
      const b = (await res.json().catch(() => ({}))) as {
        garments?: GarmentThumb[];
      };
      const list = b.garments ?? [];

      // Start/stop the reclaim clock per row, and drop bookkeeping for rows that
      // are gone (deleted).
      const now = Date.now();
      const present = new Set(list.map((g) => g.id));
      for (const g of list) {
        if (g.status === "analyzing") {
          if (!analyzingSince.current.has(g.id)) {
            analyzingSince.current.set(g.id, now);
          }
        } else {
          analyzingSince.current.delete(g.id);
        }
      }
      for (const id of [...analyzingSince.current.keys()]) {
        if (!present.has(id)) analyzingSince.current.delete(id);
      }

      setGarments(list);
      writeCache(list);
    } catch {
      // Network blip — keep showing the cache.
    }
  }, []);

  useEffect(() => {
    // Cache-first paint from sessionStorage (browser-only), then revalidate.
    const cached = readCache();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cached) setGarments(cached);
    void load();
  }, [load]);

  // THE DRIVER. Reacts to the list (and to a worker finishing) and keeps up to
  // CONCURRENCY analyses in flight over the pending rows. Runs entirely in an
  // effect, so it reads refs off the render path and setState happens in async
  // callbacks, not synchronously in the effect body.
  useEffect(() => {
    const list = garments ?? [];
    const now = Date.now();

    const markFailedView = () => {
      const failed = list
        .filter(
          (g) =>
            (g.status === "pending" || g.status === "analyzing") &&
            !settled.current.has(g.id) &&
            (attempts.current.get(g.id) ?? 0) >= MAX_ATTEMPTS,
        )
        .map((g) => g.id);
      setFailedIds(failed);
    };

    const launch = (id: string, reclaim: boolean) => {
      inFlight.current.add(id);
      void (async () => {
        try {
          const res = await fetch("/api/garments/analyze", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ garmentId: id, reclaim }),
          });
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            skipped?: boolean;
            rejected?: boolean;
          };
          if (res.ok) {
            // Analyzed or rejected — resolved. 'skipped' means another claim owns
            // it; leave it for polling, don't count it as progress or failure.
            if (!body.skipped) settled.current.add(id);
            attempts.current.delete(id);
          } else {
            const n = (attempts.current.get(id) ?? 0) + 1;
            attempts.current.set(id, n);
            if (n >= MAX_ATTEMPTS) setError(body.error || "Some pieces didn't read.");
          }
        } catch {
          const n = (attempts.current.get(id) ?? 0) + 1;
          attempts.current.set(id, n);
          if (n >= MAX_ATTEMPTS) {
            setError("Some pieces didn't read. Check your connection.");
          }
        } finally {
          inFlight.current.delete(id);
          analyzingSince.current.delete(id);
          markFailedView();
          setDrainTick((t) => t + 1); // refill the freed slot
        }
      })();
    };

    for (const g of list) {
      if (inFlight.current.size >= CONCURRENCY) break;
      if (inFlight.current.has(g.id)) continue;
      if (settled.current.has(g.id)) continue;
      if ((attempts.current.get(g.id) ?? 0) >= MAX_ATTEMPTS) continue;

      if (g.status === "pending") {
        launch(g.id, false);
      } else if (g.status === "analyzing") {
        const since = analyzingSince.current.get(g.id);
        if (since != null && now - since >= RECLAIM_AFTER_MS) {
          launch(g.id, true);
        }
      }
    }
  }, [garments, drainTick]);

  // Poll while work is outstanding: any row still on its way, or an upload in
  // flight. A row we've given up on (failed) does not keep the poll alive.
  const failedSet = new Set(failedIds);
  const active =
    (garments ?? []).some(
      (g) =>
        (g.status === "pending" || g.status === "analyzing") &&
        !failedSet.has(g.id),
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
    pollRef.current = setInterval(() => void load(), POLL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [active, load]);

  const retry = useCallback(() => {
    attempts.current.clear();
    analyzingSince.current.clear();
    setError(null);
    setFailedIds([]);
    setDrainTick((t) => t + 1);
    void load();
  }, [load]);

  const count = garments?.length ?? 0;

  // The Pieces view separates accessories into their own labeled home. An
  // accessory is any garment the eye filed under 'accessory' (glasses, watch,
  // chain, bracelet, or any other). Everything else is a piece. On the flat
  // wardrobe grid this split isn't used — it's one grid, in order.
  const isAccessory = (g: GarmentThumb) => g.analysis?.category === "accessory";
  const pieces = grouped ? (garments ?? []).filter((g) => !isAccessory(g)) : [];
  const accessories = grouped ? (garments ?? []).filter(isAccessory) : [];

  return (
    <section>
      <div className="flex items-center justify-between gap-4 mb-6">
        <p className="text-xs uppercase tracking-[0.08em] text-ash">
          Pieces{" "}
          <span className="text-iron font-mono">
            {String(count).padStart(2, "0")}
          </span>
          {uploading > 0 ? (
            <span className="ml-3 text-bone">Uploading {uploading}</span>
          ) : null}
        </p>
        <div className="flex items-center gap-2">
          {!grouped ? (
            <Link href="/pieces" className={btnNav}>
              Pieces
            </Link>
          ) : null}
          <Link href="/garments/upload" className={btnNav}>
            Batch
          </Link>
          <Link href="/garments/new" className={btnNav}>
            Add
          </Link>
        </div>
      </div>

      {error ? (
        <div className="border border-blood px-4 py-3 mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-blood text-sm uppercase tracking-[0.08em]">
              Didn&rsquo;t read
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
      ) : grouped ? (
        <div className="flex flex-col gap-16">
          {pieces.length === 0 && uploading === 0 ? (
            <p className="text-ash max-w-md">
              Empty. Shoot five pieces and I&rsquo;ll start putting outfits
              together.
            </p>
          ) : (
            <TileGrid garments={pieces} failedSet={failedSet} />
          )}

          {/* Accessories — their own labeled home, so it's unambiguous where
              they sit and where new ones go. Same upload flow, one door. */}
          <div>
            <div className="flex items-center justify-between gap-4 mb-6 border-t border-iron pt-8">
              <p className="text-xs uppercase tracking-[0.08em] text-ash">
                Accessories{" "}
                <span className="text-iron font-mono">
                  {String(accessories.length).padStart(2, "0")}
                </span>
              </p>
              <Link href="/garments/new" className={btnNav}>
                Add
              </Link>
            </div>
            {accessories.length === 0 ? (
              <p className="text-ash max-w-md">
                Glasses, a watch, a chain, a bracelet. This is where they live.
              </p>
            ) : (
              <TileGrid garments={accessories} failedSet={failedSet} />
            )}
          </div>
        </div>
      ) : garments.length === 0 && uploading === 0 ? (
        <p className="text-ash max-w-md">
          Empty. Shoot five pieces and I&rsquo;ll start putting outfits together.
        </p>
      ) : (
        <TileGrid garments={garments} failedSet={failedSet} />
      )}
    </section>
  );
}

function TileGrid({
  garments,
  failedSet,
}: {
  garments: GarmentThumb[];
  failedSet: Set<string>;
}) {
  return (
    <ul className="grid grid-cols-3 gap-1">
      {garments.map((g) => (
        <GarmentTile key={g.id} garment={g} failed={failedSet.has(g.id)} />
      ))}
    </ul>
  );
}

function GarmentTile({
  garment,
  failed,
}: {
  garment: GarmentThumb;
  failed: boolean;
}) {
  const { id, status, url, analysis } = garment;
  const rejected = status === "rejected";
  const analyzed = status === "analyzed" && analysis;

  const label = analyzed
    ? analysis.descriptor
    : rejected
      ? "Won't read"
      : failed
        ? "Didn't read — retry"
        : "Reading…";

  return (
    <li>
      <Link href={`/garments/${id}`} className="group block">
        <div
          className={
            "aspect-[3/4] border border-iron group-hover:border-paper " +
            (rejected || failed ? "opacity-40" : "")
          }
        >
          <TileImage
            cacheKey={id}
            url={url}
            alt={analyzed ? analysis.descriptor : "Garment"}
          />
        </div>
        <p className="text-ash text-xs mt-1 truncate">{label}</p>
      </Link>
    </li>
  );
}
