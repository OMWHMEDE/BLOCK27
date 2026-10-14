import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { NotifyLaunch } from "@/components/NotifyLaunch";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "BLOCK27 — What it does",
  description:
    "BLOCK27 reads the clothes you already own, builds the outfits, and names the gap. Here is how it works.",
};

// /what — the product explainer, for people who click through from the landing.
// Real product visuals (garment capture, the composed outfit, the gap screen),
// brand spacing and type, ending in the same email capture so someone convinced
// here can sign up without going back. On the shopfront allowlist.
export default function WhatPage() {
  return (
    <main className="what">
      <div aria-hidden className="grain-layer" />

      <header className="what__head">
        <Link href="/" className="what__wordmark" aria-label="BLOCK27 home">
          <Wordmark />
        </Link>
        <h1 className="what__title">Clothes you own. Worn right.</h1>
        <p className="what__lede">
          BLOCK27 reads what is already in your closet, builds the outfits, and
          tells you what your wardrobe can&rsquo;t do. Menswear. No shopping
          spree required.
        </p>
      </header>

      <section className="what__beat" aria-labelledby="beat-read">
        <figure className="what__figure">
          <Image
            src="/landing/read-1-v2.jpg"
            alt="A single garment photographed to be read into the wardrobe."
            width={736}
            height={920}
            sizes="(max-width: 820px) 100vw, 35rem"
            unoptimized
            quality={100}
            className="what__img"
          />
        </figure>
        <div className="what__copy">
          <p className="what__step">The wardrobe</p>
          <h2 id="beat-read">It reads what you own.</h2>
          <p>
            Shoot each piece once. It records the cut, the fabric, the colour,
            how formal it is, and what it works with — a dense read of every
            garment, not a photo in a folder.
          </p>
        </div>
      </section>

      <section className="what__beat what__beat--flip" aria-labelledby="beat-build">
        <figure className="what__figure">
          <Image
            src="/landing/read-2-v2.jpg"
            alt="The app composing an outfit from owned pieces, with its reasoning and the pieces it used."
            width={827}
            height={741}
            sizes="(max-width: 820px) 100vw, 35rem"
            unoptimized
            quality={100}
            className="what__img"
          />
        </figure>
        <div className="what__copy">
          <p className="what__step">The outfit</p>
          <h2 id="beat-build">It builds the outfit.</h2>
          <p>
            Tell it the occasion. It composes a look from the pieces you already
            own — one thing loud, the rest quiet — and says why it works, in
            plain words.
          </p>
        </div>
      </section>

      <section className="what__beat" aria-labelledby="beat-gap">
        <figure className="what__figure what__figure--tall">
          <Image
            src="/landing/gap-section.jpg"
            alt="The app naming a gap in the wardrobe and how many outfits closing it would unlock."
            width={828}
            height={1658}
            sizes="(max-width: 820px) 100vw, 20rem"
            unoptimized
            quality={100}
            className="what__img"
          />
        </figure>
        <div className="what__copy">
          <p className="what__step">The gap</p>
          <h2 id="beat-gap">It names the gap.</h2>
          <p>
            It finds what your clothes can&rsquo;t make — the outfit you keep
            reaching for and don&rsquo;t have — and ranks each gap by how many
            looks closing it would unlock.
          </p>
        </div>
      </section>

      <section className="what__close" aria-labelledby="what-close">
        <p className="lp__mark" aria-hidden="true">
          27
        </p>
        <h2 id="what-close" className="what__close-title">
          Same six pieces every week.
        </h2>
        <NotifyLaunch />
      </section>

      <SiteFooter />
    </main>
  );
}
