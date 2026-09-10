import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";

const CTA_HREF = "/wardrobe";
const IMG = {
  hero: "/landing/01-hero-walk-v4.jpg",
  problem: "/landing/04-editorial-concrete-v4.jpg",
  wardrobe: "/landing/03-wardrobe-selection-v4.jpg",
  // App screenshot for the "It builds the outfit" section — uploaded separately.
  buildsOutfit: "/landing/builds-the-outfit.jpg",
  // Real try-on render for the "See it on you" section — uploaded separately.
  result: "/landing/try-on-render.jpg",
  closing: "/landing/02-story-rooftop-v4.jpg",
};

function TryItNow({ className = "" }: { className?: string }) {
  return (
    <Link href={CTA_HREF} className={`landing-cta ${className}`}>
      TRY IT NOW
    </Link>
  );
}

function EditorialImage({
  src,
  alt,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 58vw",
  className = "",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  return (
    <div className={`landing-image ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        unoptimized
        quality={100}
        className="landing-image__frame"
      />
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
    <main className="landing-page">
      <div aria-hidden className="grain-layer grain-layer--animated" />

      <section className="landing-hero" aria-labelledby="hero-title">
        <Image
          src={IMG.hero}
          alt="Subject 27 walking through a stark concrete passage in a tailored black-and-white look."
          fill
          priority
          sizes="100vw"
          unoptimized
          quality={100}
          className="landing-hero__image"
        />
        <div className="landing-hero__copy landing-copy-block">
          <p className="landing-kicker">BLOCK27</p>
          <h1 id="hero-title">
            You own good clothes.
            <br />
            You wear them wrong.
          </h1>
          <p className="landing-subline">
            Photograph your wardrobe. It builds the outfits. See them on you.
          </p>
          <TryItNow />
        </div>
      </section>

      <section className="landing-section landing-section--problem" aria-labelledby="problem-title">
        <div className="landing-section__copy landing-copy-block">
          <p className="landing-kicker">The problem</p>
          <h2 id="problem-title">Same clothes.</h2>
          <p>Different decisions.</p>
        </div>
        <EditorialImage
          src={IMG.problem}
          alt="Subject 27 posed against raw concrete like a black-and-white fashion editorial."
          className="landing-image--problem"
        />
      </section>

      <section className="landing-section landing-section--wardrobe" aria-labelledby="wardrobe-title">
        <EditorialImage
          src={IMG.wardrobe}
          alt="Subject 27 studying wardrobe pieces in a quiet monochrome room."
          className="landing-image--wardrobe"
        />
        <div className="landing-section__copy landing-copy-block">
          <p className="landing-kicker">The wardrobe</p>
          <h2 id="wardrobe-title">Shoot your clothes once.</h2>
        </div>
      </section>

      <section className="landing-section landing-section--reflection" aria-labelledby="reflection-title">
        <div className="landing-section__copy landing-copy-block">
          <p className="landing-kicker">The reflection</p>
          <h2 id="reflection-title">It builds the outfit.</h2>
        </div>
        <EditorialImage
          src={IMG.buildsOutfit}
          alt="The BLOCK27 app building an outfit from the user's own wardrobe."
          className="landing-image--reflection"
        />
      </section>

      <div className="landing-cta-block">
        <TryItNow />
      </div>

      <section className="landing-result" aria-labelledby="result-title">
        <EditorialImage
          src={IMG.result}
          alt="A BLOCK27 try-on render — the chosen outfit on the user's own body."
          className="landing-image--result"
          sizes="100vw"
        />
        <div className="landing-result__copy landing-copy-block">
          <p className="landing-kicker">The result</p>
          <h2 id="result-title">See it on you.</h2>
        </div>
      </section>

      <section className="landing-close" aria-labelledby="close-title">
        <Image
          src={IMG.closing}
          alt="Subject 27 on a rooftop in the final quiet frame of the story."
          fill
          sizes="100vw"
          unoptimized
          quality={100}
          className="landing-close__image"
        />
        <div className="landing-close__copy landing-copy-block">
          <p className="landing-mark" aria-hidden="true">27</p>
          <h2 id="close-title">Stop guessing.</h2>
          <TryItNow />
        </div>
      </section>
    </main>
    <SiteFooter />
    </>
  );
}
