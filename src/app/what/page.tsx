import type { Metadata } from "next";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { NotifyLaunch } from "@/components/NotifyLaunch";

export const metadata: Metadata = {
  title: "BLOCK27 — What it does",
  description:
    "An AI stylist for the clothes you already own. It dresses you out of your own wardrobe, then names the Gap — exactly what's missing and what it would unlock.",
};

// /what — the explainer, typography only. No images: the argument is carried by
// scale, hierarchy, line length and the space between paragraphs. Three beats
// (the opening line, "That's the Gap.", and "Better wardrobe, better style.")
// hold the visual weight; everything else is body. A single reading column,
// left-aligned, tuned for phone width first. Static page.
const beat =
  "text-[clamp(1.7rem,6.5vw,2.75rem)] font-[850] tracking-[-0.03em] leading-[1.05] text-paper";
const body = "text-[1.0625rem] leading-[1.6] text-bone";

export default function WhatPage() {
  return (
    <main className="relative">
      <div aria-hidden className="grain-layer" />

      <div className="relative z-[1] mx-auto w-full max-w-xl px-6 py-16 sm:py-24">
        <Link
          href="/"
          aria-label="BLOCK27 home"
          className="inline-block text-paper"
        >
          <Wordmark />
        </Link>

        <p className={`mt-16 ${beat}`}>
          BLOCK27 is an AI stylist for the clothes you already own.
        </p>

        <p className={`mt-10 ${body}`}>
          Not a shop. Not a feed of other people&rsquo;s outfits on other
          people&rsquo;s bodies. You photograph your wardrobe, and it reads every
          piece &mdash; fabric, cut, colour, how formal it is, what it sits next
          to.
        </p>
        <p className={`mt-6 ${body}`}>
          Then it dresses you out of what&rsquo;s already in there. Combinations
          you own but never put together, with the reasoning behind each one, so
          you&rsquo;re not copying a look &mdash; you&rsquo;re learning what works
          on you.
        </p>
        <p className={`mt-6 ${body}`}>
          And once it knows your wardrobe, it knows what your wardrobe can&rsquo;t
          do.
        </p>

        <p className={`mt-16 ${beat}`}>That&rsquo;s the Gap.</p>

        <p className={`mt-10 ${body}`}>
          One page of exactly what&rsquo;s missing, and what each missing piece
          would unlock. One pair of shoes means every outfit ends the same way.
          Nothing to layer with means winter is three fits on repeat. The Gap
          names it, counts the outfits you&rsquo;d gain, and leaves the choice to
          you.
        </p>
        <p className={`mt-6 ${body}`}>
          So the next thing you buy isn&rsquo;t a guess. It&rsquo;s the one piece
          that changes the most.
        </p>

        <p className={`mt-16 ${beat}`}>
          Better wardrobe, better style. In that order.
        </p>

        <p className="mt-10 text-[1.0625rem] leading-[1.6] text-paper">
          Free to start. $9.99 a month, or $79.99 a year.
        </p>
        <p className={`mt-6 ${body}`}>
          On the App Store this month. Leave your email and you hear from us once
          &mdash; the day it&rsquo;s live.
        </p>

        <div className="mt-10 max-w-sm">
          <NotifyLaunch hideLabel />
        </div>

        <footer className="mt-16 flex flex-wrap gap-x-8 gap-y-3 border-t border-iron pt-8">
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
    </main>
  );
}
