import Link from "next/link";
import { Plate } from "@/components/Plate";
import { Reveal } from "@/components/Reveal";

const CTA_HREF = "/wardrobe";

const BEATS = [
  {
    meta: "Read",
    line: "It reads your closet.",
    img: "/landing/read-1-v2.jpg",
    alt: "A wardrobe read piece by piece",
    aspect: "736 / 920",
    layout: "landing-beat--portrait",
  },
  {
    meta: "Compose",
    line: "It puts the fit together.",
    img: "/landing/read-2-v2.jpg",
    alt: "An outfit composed from owned pieces",
    aspect: "827 / 741",
    layout: "landing-beat--reverse",
  },
  {
    meta: "Render",
    line: "It shows it on you.",
    img: "/landing/read-3-v2.jpg",
    alt: "The outfit rendered on your own body",
    aspect: "1200 / 896",
    layout: "landing-beat--wide",
  },
] as const;

function TryButton({ className = "" }: { className?: string }) {
  return (
    <Link href={CTA_HREF} className={`landing-cta ${className}`}>
      <span>Try it now</span>
      <span aria-hidden>↗</span>
    </Link>
  );
}

export default function LandingPage() {
  return (
    <main className="landing">
      <div aria-hidden className="landing-grain" />

      <section className="landing-hero" aria-labelledby="landing-title">
        <p className="landing-kicker landing-enter landing-enter--1">Personal styling / 27</p>
        <h1 id="landing-title" className="landing-wordmark landing-enter landing-enter--2">
          <span>Block</span><span>27</span>
        </h1>
        <div className="landing-hero__close">
          <p className="landing-tagline landing-enter landing-enter--3">
            You own good clothes. You wear them wrong.
          </p>
          <TryButton className="landing-enter landing-enter--4" />
        </div>
      </section>

      <section className="landing-proof" aria-labelledby="proof-title">
        <Reveal className="landing-sequence">
          <header className="landing-proof__header landing-step landing-step--1">
            <p className="landing-label">The proof</p>
            <h2 id="proof-title">Same wardrobe.<br />Worn right.</h2>
          </header>
          <div className="landing-proof__split landing-step landing-step--2">
            <figure className="landing-proof__side landing-proof__side--before">
              <Plate
                src="/landing/proof-before-v2.jpg"
                alt="Before — your clothes as you wear them now"
                aspectRatio="1055 / 768"
                objectClass="object-top"
                eager
              />
              <figcaption>Before</figcaption>
            </figure>
            <figure className="landing-proof__side landing-proof__side--after">
              <Plate
                src="/landing/proof-after-v2.jpg"
                alt="After — the outfit rendered on you"
                aspectRatio="1200 / 896"
                objectClass="object-top"
              />
              <figcaption>On you</figcaption>
            </figure>
          </div>
          <p className="landing-proof__hint landing-step landing-step--3" aria-hidden>
            Move across the proof
          </p>
        </Reveal>
      </section>

      <section className="landing-beats" aria-label="How BLOCK27 works">
        {BEATS.map((beat, index) => (
          <article className={`landing-beat ${beat.layout}`} key={beat.meta}>
            <Reveal className="landing-sequence landing-beat__inner">
              <header className="landing-beat__copy">
                <p className="landing-label landing-step landing-step--1">0{index + 1} / {beat.meta}</p>
                <h2 className="landing-step landing-step--2">{beat.line}</h2>
              </header>
              <div className="landing-beat__image landing-step landing-step--3">
                <Plate src={beat.img} alt={beat.alt} aspectRatio={beat.aspect} />
              </div>
            </Reveal>
          </article>
        ))}
      </section>

      <section className="landing-close" aria-labelledby="close-title">
        <Reveal className="landing-sequence landing-close__inner">
          <p className="landing-label landing-step landing-step--1">Dress with intent.</p>
          <h2 id="close-title" className="landing-close__mark landing-step landing-step--2">
            Block<span>27</span>
          </h2>
          <TryButton className="landing-step landing-step--3" />
        </Reveal>
      </section>
    </main>
  );
}
