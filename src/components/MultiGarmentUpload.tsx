"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { enqueueGarmentUpload } from "@/lib/uploadQueue";
import { btnNav, btnPrimary, btnSecondary } from "@/lib/ui";

type Status = "queued" | "uploading" | "done" | "failed";
type Item = { id: string; file: File; status: Status; error?: string };

const CONCURRENCY = 3;

const COACHING = [
  "Lay each item flat, one per photo",
  "Plain surface, even light",
  "Whole item in frame",
];

export function MultiGarmentUpload() {
  const router = useRouter();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [paid, setPaid] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCapacity = useCallback(async () => {
    try {
      const res = await fetch("/api/garments/capacity");
      const b = (await res.json().catch(() => ({}))) as {
        remaining?: number;
        paid?: boolean;
      };
      if (res.ok) {
        setRemaining(b.remaining ?? null);
        setPaid(!!b.paid);
      }
    } catch {
      // leave remaining null — the gate simply won't pre-empt, the row insert
      // still respects RLS.
    }
  }, []);
  useEffect(() => {
    // Async fetch on mount; the setState inside runs after await, not in render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCapacity();
  }, [loadCapacity]);

  const onPick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNotice(null);
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      if (files.length === 0) return;

      // Stop the whole batch if it would exceed the limit — never a half-import.
      if (remaining != null && files.length > remaining) {
        setNotice(
          `Over the limit. ${remaining} slot${remaining === 1 ? "" : "s"} left. Pick fewer.`,
        );
        return;
      }
      setItems(
        files.map((f, i) => ({
          id: `${Date.now()}-${i}-${f.name}`,
          file: f,
          status: "queued" as Status,
        })),
      );
    },
    [remaining],
  );

  const start = useCallback(async () => {
    setBusy(true);
    setNotice(null);

    const queue = items.filter(
      (i) => i.status === "queued" || i.status === "failed",
    );
    setItems((prev) =>
      prev.map((p) =>
        p.status === "failed"
          ? { ...p, status: "queued", error: undefined }
          : p,
      ),
    );

    let failed = 0;
    let idx = 0;
    const run = async () => {
      while (idx < queue.length) {
        const it = queue[idx++];
        setItems((prev) =>
          prev.map((p) => (p.id === it.id ? { ...p, status: "uploading" } : p)),
        );
        const err = await enqueueGarmentUpload(it.file);
        if (err) failed += 1;
        setItems((prev) =>
          prev.map((p) =>
            p.id === it.id
              ? {
                  ...p,
                  status: err ? "failed" : "done",
                  error: err ?? undefined,
                }
              : p,
          ),
        );
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, queue.length) }, run),
    );

    setBusy(false);
    void loadCapacity();
    if (failed === 0) {
      router.replace("/wardrobe");
      router.refresh();
    } else {
      setNotice(`${failed} didn't upload. Retry.`);
    }
  }, [items, router, loadCapacity]);

  const done = items.filter((i) => i.status === "done").length;
  const hasItems = items.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-ash text-sm">
          {remaining != null ? (
            <>
              <span className="font-mono">{remaining}</span> slot
              {remaining === 1 ? "" : "s"} left.
            </>
          ) : (
            "Add several at once."
          )}
        </p>
      </div>

      {!hasItems && remaining === 0 ? (
        <div className="flex flex-col gap-5">
          <p className="text-bone leading-snug max-w-md">
            {paid
              ? "You're at the cap for now."
              : "Fifteen is the free limit. Upgrade for more."}
          </p>
          {!paid ? (
            <Link href="/settings" className={`${btnPrimary} self-start`}>
              Upgrade
            </Link>
          ) : null}
        </div>
      ) : !hasItems ? (
        <div className="flex flex-col gap-6">
          <ul className="flex flex-col gap-2">
            {COACHING.map((line) => (
              <li key={line} className="flex gap-3 text-bone text-sm">
                <span aria-hidden className="text-ash">
                  —
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <label className={`${btnPrimary} w-full cursor-pointer`}>
            Choose photos
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onPick}
              className="hidden"
            />
          </label>
          <Link href="/garments/new" className={`${btnNav} self-start`}>
            One at a time
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-xs uppercase tracking-[0.08em] text-ash">
            <span className="font-mono">{String(done).padStart(2, "0")}</span>
            <span className="text-iron"> / </span>
            <span className="font-mono">
              {String(items.length).padStart(2, "0")}
            </span>{" "}
            uploaded
          </p>

          <ul className="flex flex-col">
            {items.map((it, i) => (
              <li
                key={it.id}
                className="flex flex-col gap-1 border-t border-iron py-2.5 first:border-t-0"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-bone text-sm truncate font-mono">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <StatusLabel status={it.status} />
                </div>
                {it.status === "failed" && it.error ? (
                  <p className="text-ash text-xs leading-snug">{it.error}</p>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={start}
              disabled={busy || items.every((i) => i.status === "done")}
              className={btnPrimary}
            >
              {busy
                ? "Uploading."
                : items.some((i) => i.status === "failed")
                  ? "Retry"
                  : `Upload ${items.length}`}
            </button>
            {!busy ? (
              <button
                type="button"
                onClick={() => {
                  setItems([]);
                  setNotice(null);
                }}
                className={btnSecondary}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>
      )}

      {notice ? <p className="text-bone text-sm max-w-md">{notice}</p> : null}
    </div>
  );
}

function StatusLabel({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    queued: "Queued",
    uploading: "Uploading",
    done: "Done",
    failed: "Failed",
  };
  const tone =
    status === "done"
      ? "text-ash"
      : status === "failed"
        ? "text-bone"
        : status === "uploading"
          ? "text-paper"
          : "text-ash";
  return (
    <span className={`text-xs uppercase tracking-[0.08em] ${tone}`}>
      {map[status]}
    </span>
  );
}
