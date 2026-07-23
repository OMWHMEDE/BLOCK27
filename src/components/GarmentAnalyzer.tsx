"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Drives garment analysis from the wardrobe: kicks off analysis for any garment
// still 'pending' (once per session, deduped by id), then refreshes on an
// interval while anything is pending/analyzing so the read-back appears when it
// lands. The analyze endpoint is idempotent, so a double-fire is harmless.
export function GarmentAnalyzer({
  pendingIds,
  active,
}: {
  pendingIds: string[];
  active: boolean;
}) {
  const router = useRouter();
  const triggered = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const id of pendingIds) {
      if (triggered.current.has(id)) continue;
      triggered.current.add(id);
      fetch("/api/garments/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ garmentId: id }),
      }).catch(() => {});
    }
  }, [pendingIds]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [active, router]);

  return null;
}
