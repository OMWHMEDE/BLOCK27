"use client";

// Garment uploads run here, at module scope, so leaving the capture screen does
// not abort them — an in-flight upload stays queued and finishes instead of
// restarting from zero. The photo blob lives only in memory for the life of the
// upload; nothing is written to persistent storage client-side. A subscriber
// (the wardrobe grid) shows how many are still going.
//
// The upload goes to the server route, which moderates the image before it is
// ever stored and records the row. Identity comes from the session there.

type Listener = () => void;
const listeners = new Set<Listener>();
let active = 0;

export function queueSize(): number {
  return active;
}

export function onQueueChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function notify() {
  for (const fn of listeners) fn();
}

// Uploads one garment through the moderation gate. Returns an error/rejection
// string to show, or null on success.
export async function enqueueGarmentUpload(file: Blob): Promise<string | null> {
  active += 1;
  notify();
  try {
    const form = new FormData();
    form.append("file", file, "garment.jpg");
    let body: { ok?: boolean; reason?: string };
    try {
      const res = await fetch("/api/garments/upload", {
        method: "POST",
        body: form,
      });
      body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        reason?: string;
      };
    } catch {
      return "Couldn't reach the server. Try again.";
    }
    if (!body.ok) return body.reason || "Didn't save. Try again.";
    return null;
  } finally {
    active -= 1;
    notify();
  }
}
