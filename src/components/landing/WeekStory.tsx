"use client";

import { getImageProps } from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { WaitlistInvite } from "@/components/WaitlistInvite";
import styles from "./week.module.css";

// The landing story, told in four scrolls:
//   1. 1600 — he owned one outfit, and never had to think about tomorrow.
//   2. Today — closets full, same outfit all week.
//   3. The latest update: BLOCK27 — the same man, styled three ways.
//   4. What it is, and the button.
// Each scene is a tall section with a sticky stage; how far you've scrolled
// through it drives which lines are showing (and which fit, in scene 3).
// The paintings fill the screen (public/landing/week) and stay sharp; the
// words slide up on solid black bands, TikTok-slideshow style, and scenes cut
// clean. The last page breaks from the paintings on purpose: a real photo on
// light ground with tiny planes and parachuting Subject 27s drifting around
// it. No prices on this page.

const FITS = [
  { src: "/landing/week/fit-workwear.webp", plate: "Workwear" },
  { src: "/landing/week/fit-street.webp", plate: "Streetwear" },
  { src: "/landing/week/fit-tailored.webp", plate: "Tailored" },
];

// 0 when the section's top reaches the top of the screen, 1 when its bottom
// reaches the bottom — the scroll range the sticky stage is pinned for.
function useSectionProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      const p = range > 0 ? -rect.top / range : rect.top <= 0 ? 1 : 0;
      setProgress(Math.min(Math.max(p, 0), 1));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return [ref, progress] as const;
}

function Line({ show, big, children }: { show: boolean; big?: boolean; children: ReactNode }) {
  return (
    <p className={`${styles.line} ${big ? styles.lineBig : ""} ${show ? styles.lineOn : ""}`}>
      <span>{children}</span>
    </p>
  );
}

// The painting fills the screen, sharp.
function Backdrop({
  src,
  priority,
  visible = true,
}: {
  src: string;
  priority?: boolean;
  visible?: boolean;
}) {
  // Art direction: the tall painting on phones, the wide one (same name +
  // "-wide") on landscape screens.
  const wideSrc = src.replace(/\.webp$/, "-wide.webp");
  const common = { alt: "", fill: true, sizes: "100vw", quality: 82, priority };
  const {
    props: { srcSet: wideSet },
  } = getImageProps({ ...common, src: wideSrc });
  const {
    props: { srcSet: tallSet, ...img },
  } = getImageProps({ ...common, src });
  return (
    <div className={`${styles.backdrop} ${visible ? styles.backdropOn : ""}`} aria-hidden>
      <picture>
        <source media="(orientation: landscape)" srcSet={wideSet} />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
        <img {...img} srcSet={tallSet} className={styles.backdropImg} />
      </picture>
    </div>
  );
}

// The 27 mark, traced from the app icon.
function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 777 498" className={className} aria-hidden>
      <polygon points="0,0 379,0 379,298 100,298 100,398 379,398 379,498 0,498 0,198 279,198 279,100 0,100" />
      <polygon points="429,0 777,0 777,100 629,498 529,498 677,100 429,100" />
    </svg>
  );
}

// A tiny plane trailing a hairline, and a tiny masked figure under a canopy —
// the life on the last page.
function Plane({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 24" className={className} aria-hidden>
      <line x1="0" y1="12" x2="118" y2="12" className={styles.trail} />
      <path d="M118 12 L150 9 Q158 12 150 15 Z M134 12 L128 2 L133 2 L142 11 Z M134 12 L128 22 L133 22 L142 13 Z M120 12 L117 6 L120 6 L124 11 Z" />
    </svg>
  );
}
function Chute({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 60" className={className} aria-hidden>
      <path d="M2 16 Q20 -4 38 16 Q33 12 29 16 Q24 11 20 16 Q16 11 11 16 Q7 12 2 16 Z" />
      <path d="M3 16 L18 40 M37 16 L22 40 M12 16 L19 40 M28 16 L21 40" className={styles.lines} />
      <circle cx="20" cy="42" r="3.4" />
      <path d="M17 45 h6 l1 9 h-2.5 l-1.5 -5 l-1.5 5 h-2.5 z" />
    </svg>
  );
}

function GetButton({ appStoreUrl, small }: { appStoreUrl: string | null; small?: boolean }) {
  const [open, setOpen] = useState(false);
  const inner = (
    <>
      <Mark className={styles.getMark} />
      <span className={styles.getText}>
        <span className={styles.getLabel}>Get BLOCK27</span>
        {!small ? (
          <span className={styles.getSub}>{appStoreUrl ? "Free on the App Store" : "Coming to the App Store"}</span>
        ) : null}
      </span>
    </>
  );
  const cls = `${styles.get} ${small ? styles.getSmall : ""}`;
  if (appStoreUrl) {
    return (
      <a href={appStoreUrl} className={cls}>
        {inner}
      </a>
    );
  }
  if (small) {
    return (
      <a href="#get" className={cls}>
        {inner}
      </a>
    );
  }
  // Pre-launch: the button opens the waitlist form, on a black card.
  return open ? (
    <div className={styles.waitCard}>
      <WaitlistInvite />
    </div>
  ) : (
    <button type="button" className={cls} onClick={() => setOpen(true)}>
      {inner}
    </button>
  );
}

export function WeekStory({ appStoreUrl }: { appStoreUrl: string | null }) {
  const [thenRef, thenP] = useSectionProgress<HTMLElement>();
  const [todayRef, todayP] = useSectionProgress<HTMLElement>();
  const [updateRef, updateP] = useSectionProgress<HTMLElement>();

  // Scene 3: the headline holds for the first stretch, then the fits roll.
  const fitIndex = Math.min(FITS.length - 1, Math.floor(Math.max(updateP - 0.12, 0) / (0.88 / FITS.length)));

  return (
    <div className={styles.page}>
      <div className={styles.grain} aria-hidden />

      <header className={styles.nav}>
        <span className={styles.wordmark}>BLOCK27</span>
        <GetButton appStoreUrl={appStoreUrl} small />
      </header>

      {/* 1 — 1600 */}
      <section ref={thenRef} className={styles.scene}>
        <div className={styles.stage}>
          <Backdrop src="/landing/week/then.webp" priority />
          <div className={styles.copy}>
            <Line show={thenP > 0.08} big>
              In 1600, he owned one outfit.
            </Line>
            <Line show={thenP > 0.4}>He never had to think about what to wear tomorrow.</Line>
          </div>
          <span className={`${styles.hint} ${thenP > 0.05 ? styles.hintOff : ""}`}>Scroll</span>
        </div>
      </section>

      {/* 2 — Today */}
      <section ref={todayRef} className={styles.scene}>
        <div className={styles.stage}>
          <Backdrop src="/landing/week/today.webp" />
          <div className={styles.copy}>
            <Line show={todayP > 0.08} big>
              Today, the poorest of us own more clothes than he ever did.
            </Line>
            <Line show={todayP > 0.45}>
              Our closets are full. And we still wear the same outfit all week.
            </Line>
          </div>
        </div>
      </section>

      {/* 3 — The latest update */}
      <section ref={updateRef} className={`${styles.scene} ${styles.sceneLong}`}>
        <div className={styles.stage}>
          {FITS.map((fit, i) => (
            <Backdrop key={fit.src} src={fit.src} visible={i === fitIndex} />
          ))}
          <span className={styles.plate}>{FITS[fitIndex].plate}</span>
          <div className={styles.copy}>
            <Line show={updateP > 0.02}>The latest update:</Line>
            <Line show={updateP > 0.06} big>
              <span className={styles.brand}>BLOCK27.</span>
            </Line>
            <Line show={updateP > 0.3}>Same closet. Styled.</Line>
          </div>
        </div>
      </section>

      {/* 4 — The CTA: a different world. Light ground, the real photo, life
          drifting around him. */}
      <section id="get" className={styles.end}>
        <div className={styles.sky} aria-hidden>
          <Plane className={`${styles.plane} ${styles.p1}`} />
          <Plane className={`${styles.plane} ${styles.p2}`} />
          <Plane className={`${styles.plane} ${styles.p3}`} />
          <Chute className={`${styles.chute} ${styles.c1}`} />
          <Chute className={`${styles.chute} ${styles.c2}`} />
          <Chute className={`${styles.chute} ${styles.c3}`} />
          <Chute className={`${styles.chute} ${styles.c4}`} />
          <Chute className={`${styles.chute} ${styles.c5}`} />
        </div>
        <div className={styles.endInner}>
          <div className={styles.endCopy}>
            <p className={styles.endLead}>An AI stylist for the clothes you already own.</p>
            <p className={styles.endBig}>Time to level up.</p>
            <div className={styles.endCta}>
              <GetButton appStoreUrl={appStoreUrl} />
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- one static photo */}
          <img src="/landing/week/cta.webp" alt="Subject 27" className={styles.endPhoto} width={1122} height={1402} />
        </div>
        <footer className={styles.footer}>
          {[
            { href: "/privacy", label: "Privacy" },
            { href: "/terms", label: "Terms" },
            { href: "/refund", label: "Refund" },
            { href: "/support", label: "Support" },
          ].map((link) => (
            <Link key={link.href} href={link.href} className={styles.footerLink}>
              {link.label}
            </Link>
          ))}
        </footer>
      </section>
    </div>
  );
}
