"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { PaidTier } from "@/lib/whop/plans";
import { ERR_RETRY } from "@/lib/support";

// The Whop embed is a browser-only iframe widget — load it client-side only so
// it never runs during SSR.
const WhopCheckoutEmbed = dynamic(
  () => import("@whop/checkout/react").then((m) => m.WhopCheckoutEmbed),
  { ssr: false, loading: () => <Pending /> },
);

// The paid checkout for one tier. It asks our server to create a Whop checkout
// session (which stamps the buyer's user id as metadata), then renders Whop's
// embedded checkout for that session. A failure shows the house cold line — no
// provider detail. Styled to the brand: paper accent on a void ground, no radius.
export function WhopCheckout({ tier }: { tier: PaidTier }) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/whop/checkout-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tier }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          sessionId?: string;
          error?: string;
        };
        if (!alive) return;
        if (res.ok && body.ok && body.sessionId) {
          setSessionId(body.sessionId);
        } else {
          setError(body.error || ERR_RETRY);
        }
      } catch {
        if (alive) setError(ERR_RETRY);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tier]);

  if (error) {
    return (
      <p className="text-blood text-sm border border-blood px-3 py-2 max-w-md">
        {error}
      </p>
    );
  }

  if (!sessionId) return <Pending />;

  return (
    <div className="w-full">
      <WhopCheckoutEmbed
        sessionId={sessionId}
        theme="dark"
        themeOptions={{
          accentColor: "#F2F0EC",
          backgroundColor: "#000000",
          borderRadius: 0,
        }}
        onComplete={() => {
          // Paid — the webhook grants the tier; bounce to settings and refresh
          // so the new plan shows once it lands.
          router.push("/settings");
          router.refresh();
        }}
      />
    </div>
  );
}

function Pending() {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <p className="pulse-slow uppercase tracking-[0.25em] text-bone text-sm">
        Opening checkout
      </p>
      <span aria-hidden className="pulse-slow block h-px w-16 bg-bone" />
    </div>
  );
}
