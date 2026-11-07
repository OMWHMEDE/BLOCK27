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
// The paintings fill the screen (public/landing/week) and blur when the
// words get serious. No prices on this page.

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
      {children}
    </p>
  );
}

// The painting fills the screen. `blur` (0–1) softens it once the words
// arrive, so they read over it; a flat tint goes with the blur.
function Backdrop({
  src,
  blur,
  priority,
  visible = true,
}: {
  src: string;
  blur: number;
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
    props: { srcSet: tallSet, style: fillStyle, ...img },
  } = getImageProps({ ...common, src });
  return (
    <div className={`${styles.backdrop} ${visible ? styles.backdropOn : ""}`} aria-hidden>
      <picture>
        <source media="(orientation: landscape)" srcSet={wideSet} />
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
        <img
          {...img}
          srcSet={tallSet}
          className={styles.backdropImg}
          style={{
            ...fillStyle,
            filter: `blur(${(blur * 14).toFixed(1)}px)`,
            transform: `scale(${1.04 + blur * 0.04})`,
          }}
        />
      </picture>
      <div className={styles.tint} style={{ opacity: 0.22 + blur * 0.4 }} />
    </div>
  );
}

// Blur ramps in over a short stretch after `from`.
const ramp = (p: number, from: number, span = 0.18) => Math.min(Math.max((p - from) / span, 0), 1);

function GetButton({ appStoreUrl }: { appStoreUrl: string | null }) {
  if (appStoreUrl) {
    return (
      <a href={appStoreUrl} className={styles.cta}>
        Download free
      </a>
    );
  }
  return <WaitlistInvite />;
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
        <a href="#get" className={styles.navCta}>
          Get BLOCK27
        </a>
      </header>

      {/* 1 — 1600 */}
      <section ref={thenRef} className={styles.scene}>
        <div className={styles.stage}>
          <Backdrop src="/landing/week/then.webp" blur={ramp(thenP, 0.3)} priority />
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
          <Backdrop src="/landing/week/today.webp" blur={ramp(todayP, 0.1)} />
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
            <Backdrop key={fit.src} src={fit.src} blur={0} visible={i === fitIndex} />
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

      {/* 4 — What it is, and the way in */}
      <section id="get" className={styles.end}>
        <Backdrop src={FITS[FITS.length - 1].src} blur={1} />
        <p className={styles.endLead}>An AI stylist for the clothes you already own.</p>
        <p className={styles.endBig}>Time to level up.</p>
        <div className={styles.endCta}>
          <GetButton appStoreUrl={appStoreUrl} />
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
