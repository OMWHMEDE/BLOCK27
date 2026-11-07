"use client";

import Link from "next/link";
import { useState } from "react";
import { WaitlistInvite } from "@/components/WaitlistInvite";
import styles from "./week.module.css";

// The landing: one screen. Subject 27 huge on light ground, "Time to level
// up" across him (inverting where it crosses him), tiny planes and
// parachuting Subject 27s drifting around, one button, and the legal links.
// No prices on this page.

// Subject 27 on the opening page: the transparent cut-out.
const SUBJECT_SRC = "/landing/week/subject.webp";

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

// A tiny figure in free fall, no canopy.
function Faller({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" className={className} aria-hidden>
      <circle cx="15" cy="6" r="3.4" />
      <path d="M13 10 h4 l1.2 8 h-1.6 l1.4 9 h-2.4 l-1.6 -7 l-1.6 7 h-2.4 l1.4 -9 h-1.6 z" />
      <path d="M13.4 11 L5 4.5 L4 6 L12.6 13 Z M16.6 11 L25 4.5 L26 6 L17.4 13 Z" />
    </svg>
  );
}

// The black cloud, and the blood rain under it. Drop positions are fixed so
// the server and the browser draw the same rain.
const DROPS = Array.from({ length: 44 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: -((i * 0.53) % 1.7),
  duration: 0.9 + ((i * 7) % 6) / 10,
  length: 10 + ((i * 5) % 9),
}));
function Storm() {
  return (
    <div className={styles.storm} aria-hidden>
      <svg viewBox="0 0 340 150" className={styles.cloud}>
        <defs>
          <filter id="storm-soft" x="-20%" y="-30%" width="140%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="27" />
            <feDisplacementMap in="SourceGraphic" scale="18" />
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>
        <g filter="url(#storm-soft)">
          <ellipse cx="170" cy="96" rx="150" ry="30" />
          <circle cx="92" cy="78" r="38" />
          <circle cx="150" cy="58" r="50" />
          <circle cx="212" cy="66" r="44" />
          <circle cx="262" cy="84" r="32" />
          <circle cx="60" cy="96" r="24" />
        </g>
      </svg>
      <div className={styles.rain}>
        {DROPS.map((d, i) => (
          <span
            key={i}
            className={styles.drop}
            style={{
              left: `${d.left}%`,
              height: `${d.length}px`,
              animationDelay: `${d.delay}s`,
              animationDuration: `${d.duration}s`,
            }}
          />
        ))}
      </div>
    </div>
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
  return (
    <div className={styles.page}>
      <div className={styles.grain} aria-hidden />

      <header className={styles.nav}>
        <span className={styles.wordmark}>BLOCK27</span>
      </header>

      {/* 0 — The opening: the CTA, with life around him. */}
      <section id="get" className={styles.hero}>
        <Storm />
        <div className={styles.sky} aria-hidden>
          <Faller className={`${styles.faller} ${styles.f1}`} />
          <Faller className={`${styles.faller} ${styles.f2}`} />
          <Faller className={`${styles.faller} ${styles.f3}`} />
          <Plane className={`${styles.plane} ${styles.p1}`} />
          <Plane className={`${styles.plane} ${styles.p2}`} />
          <Plane className={`${styles.plane} ${styles.p3}`} />
          <Chute className={`${styles.chute} ${styles.c1}`} />
          <Chute className={`${styles.chute} ${styles.c2}`} />
          <Chute className={`${styles.chute} ${styles.c3}`} />
          <Chute className={`${styles.chute} ${styles.c4}`} />
          <Chute className={`${styles.chute} ${styles.c5}`} />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- one static cut-out */}
        <img src={SUBJECT_SRC} alt="Subject 27" className={styles.heroSubject} width={488} height={941} />
        <div className={styles.heroCopy}>
          <p className={styles.heroLead}>An AI stylist for the clothes you already own.</p>
          <h1 className={styles.heroBig}>Time to level up.</h1>
        </div>
        <div className={styles.heroCta}>
          <GetButton appStoreUrl={appStoreUrl} />
        </div>
        <footer className={styles.heroFooter}>
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
