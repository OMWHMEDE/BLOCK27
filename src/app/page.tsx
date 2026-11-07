import Link from "next/link";
import { WaitlistInvite } from "@/components/WaitlistInvite";
import styles from "./waitlist/waitlist.module.css";

// Set NEXT_PUBLIC_APP_STORE_URL in Vercel the day the app is live: the
// waitlist form becomes the App Store button. Unset = pre-launch waitlist.
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim() || null;

const STEPS = [
  "Photograph the clothes you already own.",
  "It builds the outfits.",
  "It tells you the one piece you're missing.",
];

const FOOTER = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund", label: "Refund" },
  { href: "/support", label: "Support" },
];

// The landing. Its one job is sending people to the app: the wordmark, the
// line, what it does in three steps, one button, and the legal links the
// stores require. No prices here: they're shown inside the app.
// (History: the original BLOCK27 invite — the wordmark emerging from a hazy
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
          An AI stylist for the clothes already in your closet.
        </p>

        <ol
          className={`${styles.reveal} ${styles.d3} mb-12 flex max-w-sm flex-col gap-3 text-left`}
        >
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-baseline gap-4 text-paper">
              <span className="font-mono text-[0.72rem] tracking-[0.18em] text-ash">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-base leading-snug">{step}</span>
            </li>
          ))}
        </ol>

        <div className={`${styles.reveal} ${styles.d4} flex w-full flex-col items-center gap-6`}>
          {APP_STORE_URL ? (
            <a
              href={APP_STORE_URL}
              className="inline-flex h-14 items-center justify-center bg-paper px-10 text-[0.8rem] font-black uppercase tracking-[0.28em] text-void hover:bg-bone"
            >
              Download on the App Store
            </a>
          ) : (
            <WaitlistInvite />
          )}
        </div>
      </main>

      <footer className="relative z-[1] flex flex-wrap justify-center gap-x-8 gap-y-3 px-6 pb-10">
        {FOOTER.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ash hover:text-paper"
          >
            {link.label}
          </Link>
        ))}
      </footer>
    </div>
  );
}
