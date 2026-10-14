import Link from "next/link";
import { NotifyLaunch } from "@/components/NotifyLaunch";
import { WhatLink } from "@/components/WhatLink";

// The landing: one screen, no scroll on a phone. The 27 mark, one line, the
// launch-email capture (same waitlist action — source attribution and the
// confirmation email keep working), a quiet way through to /what, and a minimal
// footer whose legal + support links must stay reachable for the app stores.
//
// It does not explain the product. The restraint is the point — type scale,
// space, and emptiness carry it. Static: nothing here reads a dynamic server
// API, and the source parameter is read client-side in NotifyLaunch/WhatLink.
export default function LandingPage() {
  return (
    <main className="lp">
      <div aria-hidden className="grain-layer" />

      <div className="lp__inner">
        <p className="lp__mark" aria-hidden="true">
          27
        </p>
        <h1 className="lp__headline">Same six pieces every week.</h1>
        <NotifyLaunch hideLabel />
        <WhatLink className="lp__what">What is BLOCK27?</WhatLink>
      </div>

      <footer className="lp__footer">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/support">Support</Link>
      </footer>
    </main>
  );
}
