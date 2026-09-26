"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-runs the server component (fresh DB reads) on an interval. All data access
// stays server-side — the service-role key never touches the client.
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
