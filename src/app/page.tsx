import Link from "next/link";
import { WaitlistInvite } from "@/components/WaitlistInvite";
import { WhatLink } from "@/components/WhatLink";
import styles from "./waitlist/waitlist.module.css";

// The landing: the original BLOCK27 invite — the wordmark emerging from a hazy
// glow, the gold rule, one line, and the request-invite form — now carrying the
// launch essentials: the email capture keeps source attribution and the
// confirmation email (WaitlistInvite -> notifyLaunch), a quiet way through to
// /what, and a Privacy/Terms/Support footer so the store-required legal links
// stay reachable. Static: no dynamic server API here; the source is read
// client-side in WaitlistInvite/WhatLink.
export default function LandingPage() {
  return (
    <div className={styles.stage}>
      <div className={styles.glow} aria-hidden />
      <div className={styles.haze} aria-hidden />
      <div className={styles.haze2} aria-hidden />
      <div className={styles.vignette} aria-hidden />
      <div className={styles.grain} aria-hidden />

      <main className="relative z-[1] flex w-full flex-1 flex-col items-center justify-center px-6 py-14 text-center">
        <h1
          className={`${styles.reveal} ${styles.d1} text-[clamp(2.75rem,16vw,8rem)] font-black uppercase leading-[0.82] tracking-[-0.04em] text-paper`}
        >
          BLOCK27
        </h1>

        <hr className={`${styles.rule} mb-14 mt-8`} />

        <h2
          className={`${styles.reveal} ${styles.d3} mb-4 max-w-md text-2xl font-bold uppercase leading-[0.98] tracking-tight text-paper sm:text-3xl`}
        >
          You own good clothes. You wear them wrong.
        </h2>
        <p className={`${styles.reveal} ${styles.d3} mb-10 max-w-sm text-bone`}>
          An AI stylist for the clothes already in your closet. It builds the
          outfits and names the gap.
        </p>

        <div
          className={`${styles.reveal} ${styles.d4} flex w-full flex-col items-center gap-6`}
        >
          <WaitlistInvite />
          <WhatLink className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-ash underline decoration-iron underline-offset-4 hover:text-bone">
            What is BLOCK27?
          </WhatLink>
        </div>
      </main>

      <footer className="relative z-[1] flex flex-wrap justify-center gap-x-8 gap-y-3 px-6 pb-10">
        <Link
          href="/privacy"
          className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ash hover:text-paper"
        >
          Privacy
        </Link>
        <Link
          href="/terms"
          className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ash hover:text-paper"
        >
          Terms
        </Link>
        <Link
          href="/support"
          className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ash hover:text-paper"
        >
          Support
        </Link>
      </footer>
    </div>
  );
}
