import Image from "next/image";
import Link from "next/link";

const CTA_HREF = "/wardrobe";
const IMG = {
  hero: "/landing/01-hero-walk-v3.png",
  problem: "/landing/04-editorial-concrete-v3.png",
  wardrobe: "/landing/03-wardrobe-selection-v3.png",
  reflection: "/landing/05-reflection-v3.png",
  gallery: "/landing/06-gallery-v3.png",
  stairs: "/landing/07-stairs-v3.png",
  result: "/landing/11-studio-editorial-v3.png",
  closing: "/landing/02-story-rooftop-v3.png",
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
        className="landing-image__frame"
      />
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="landing-page">
      <div aria-hidden className="grain-layer grain-layer--animated" />

      <section className="landing-hero" aria-labelledby="hero-title">
        <Image
          src={IMG.hero}
          alt="Subject 27 walking through a stark concrete passage in a tailored black-and-white look."
          fill
          priority
          sizes="100vw"
          className="landing-hero__image"
        />
        <div className="landing-hero__copy landing-copy-block">
          <p className="landing-kicker">BLOCK27</p>
          <h1 id="hero-title">
            You own good clothes.
            <br />
            You wear them wrong.
          </h1>
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
          <h2 id="wardrobe-title">It reads what you own.</h2>
        </div>
      </section>

      <section className="landing-section landing-section--reflection" aria-labelledby="reflection-title">
        <div className="landing-section__copy landing-copy-block">
          <p className="landing-kicker">The reflection</p>
          <h2 id="reflection-title">It understands proportion.</h2>
          <p>Not trends.</p>
        </div>
        <EditorialImage
          src={IMG.reflection}
          alt="Subject 27 reflected in a mirror, creating a quiet visual handoff in the story."
          className="landing-image--reflection"
        />
      </section>

      <section className="landing-section landing-section--world" aria-labelledby="world-title">
        <div className="landing-world-grid">
          <EditorialImage
            src={IMG.gallery}
            alt="Subject 27 moving through a spare gallery-like interior."
            className="landing-image--gallery"
          />
          <EditorialImage
            src={IMG.stairs}
            alt="Subject 27 on concrete stairs in the same restrained monochrome world."
            className="landing-image--stairs"
            sizes="(max-width: 768px) 72vw, 28vw"
          />
        </div>
        <div className="landing-section__copy landing-copy-block">
          <p className="landing-kicker">The world</p>
          <h2 id="world-title">Built with intent.</h2>
        </div>
      </section>

      <section className="landing-result" aria-labelledby="result-title">
        <EditorialImage
          src={IMG.result}
          alt="Subject 27 in a studio editorial frame, styled with decisive proportion and restraint."
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
          className="landing-close__image"
        />
        <div className="landing-close__copy landing-copy-block">
          <p className="landing-mark" aria-hidden="true">27</p>
          <h2 id="close-title">Stop guessing.</h2>
          <TryItNow />
        </div>
      </section>
    </main>
  );
}
