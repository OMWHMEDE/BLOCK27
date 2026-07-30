import Link from "next/link";
import { btnPrimary } from "@/lib/ui";
import { Reveal } from "@/components/Reveal";
import { Plate } from "@/components/Plate";

// The premium front. It sells with the product, not paragraphs: a wordmark that
// fills the screen, a full-bleed before/after that does more than any copy, three
// cold beats, and one repeated action. Luxury is the space, the type, the grain,
// and the slow arrival — never clutter. bone-white on true black is the only
// accent; no cards, no glow, no gradient, border-radius 0. Every "Try it now"
// drops the visitor into the app as a guest.

const CTA_HREF = "/wardrobe";

// Each beat's box is sized to the REAL aspect ratio of its source image, so the
// photo fills it with no crop and no dead space. read-1 is portrait (736x920,
// taller than wide); read-2 (827x741) and read-3 (1200x896) are landscape — so
// the sections are intentionally different shapes. Update the ratio here if an
// image is replaced with different dimensions.
const BEATS: {
  meta: string;
  line: string;
  img: string;
  alt: string;
  aspect: string;
}[] = [
  {
    meta: "Read",
    line: "It reads your closet.",
    img: "/landing/read-1.jpg",
    alt: "A wardrobe read piece by piece",
    aspect: "736 / 920",
  },
  {
    meta: "Compose",
    line: "It puts the fit together.",
    img: "/landing/read-2.jpg",
    alt: "An outfit composed from owned pieces",
    aspect: "827 / 741",
  },
  {
    meta: "Render",
    line: "It shows it on you.",
    img: "/landing/read-3.jpg",
    alt: "The outfit rendered on your own body",
    aspect: "1200 / 896",
  },
];

function TryButton({ delayMs }: { delayMs?: number }) {
  return (
    <Link
      href={CTA_HREF}
      className={`${btnPrimary} reveal`}
      style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      Try it now
    </Link>
  );
}

export default function LandingPage() {
  return (
    <main className="relative w-full overflow-hidden">
      <div aria-hidden className="grain-layer" />

      {/* 1 — HERO. Type is the hero; the "27" reversed out of a --paper block is
          the one structural use of the house device. */}
      <section className="relative z-10 flex min-h-svh flex-col px-6 py-16">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center">
          <h1
            className="reveal font-black uppercase leading-[0.82] tracking-[-0.04em]"
            style={{ fontSize: "clamp(4rem, 14vw, 11rem)" }}
          >
            <span className="block">Block</span>
            <span className="mt-2 inline-block bg-paper px-[0.1em] pb-[0.05em] text-void">
              27
            </span>
          </h1>
          <p
            className="reveal mt-12 max-w-md text-ash"
            style={{ animationDelay: "120ms" }}
          >
            You own good clothes. You wear them wrong.
          </p>
        </div>
        <div className="mx-auto w-full max-w-2xl">
          <TryButton delayMs={240} />
        </div>
      </section>

      {/* 2 — THE PROOF. A real try-on, full-bleed, split hard down the middle:
          left the clothes as you own them, right the outfit on you. No slider,
          no frame. This sells more than any sentence. Top-only spacing — the
          next section owns the gap below, so stacked sections never double up
          into a dead black zone. */}
      <section className="relative z-10 pt-[104px]">
        <Reveal>
          <div className="mx-auto mb-12 w-full max-w-2xl px-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-ash">
              The proof
            </p>
            <p className="mt-4 max-w-md text-bone leading-snug">
              Same wardrobe. One of them is wearing it right.
            </p>
          </div>

          <div className="grid w-full grid-cols-2">
            <div className="relative">
              <Plate
                src="/landing/proof-before.jpg"
                alt="Before — your clothes as you wear them now"
                aspectRatio="1055 / 768"
                objectClass="object-top"
                eager
              />
              <span className="absolute bottom-3 left-3 bg-void px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-paper">
                Before
              </span>
            </div>
            <div className="relative border-l-2 border-paper">
              <Plate
                src="/landing/proof-after.jpg"
                alt="After — the outfit rendered on you"
                aspectRatio="1200 / 896"
                objectClass="object-top"
              />
              <span className="absolute bottom-3 right-3 bg-void px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-paper">
                On you
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* 3 — HOW IT READS. Three beats: one cold line over one full-bleed image,
          stacked. A single 104px gap between beats (flex gap, not per-beat
          padding) so each beat hugs its content and there's no doubled black
          zone below an image. The close section owns the gap after the last. */}
      <section className="relative z-10 flex flex-col gap-[104px] pt-[104px]">
        {BEATS.map((b) => (
          <div key={b.meta}>
            <Reveal>
              <div className="mx-auto mb-10 w-full max-w-2xl px-6">
                <p className="mb-5 font-mono text-xs uppercase tracking-[0.24em] text-ash">
                  {b.meta}
                </p>
                <h2
                  className="font-black uppercase leading-[0.9] tracking-[-0.03em]"
                  style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
                >
                  {b.line}
                </h2>
              </div>
              <Plate
                src={b.img}
                alt={b.alt}
                className="w-full"
                aspectRatio={b.aspect}
              />
            </Reveal>
          </div>
        ))}
      </section>

      {/* 4 — CLOSE. The mark, one last action, silence around it. */}
      <section className="relative z-10 flex min-h-svh flex-col items-center justify-center px-6 py-[168px] text-center">
        <Reveal className="flex flex-col items-center gap-14">
          <h2
            className="font-black uppercase leading-[0.85] tracking-[-0.04em]"
            style={{ fontSize: "clamp(2.5rem, 9vw, 6rem)" }}
          >
            Block
            <span className="ml-[0.12em] inline-block bg-paper px-[0.1em] pb-[0.05em] text-void">
              27
            </span>
          </h2>
          <TryButton />
        </Reveal>
      </section>
    </main>
  );
}
