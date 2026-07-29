import Link from "next/link";
import { btnPrimary } from "@/lib/ui";

// The front door. A stranger lands here first: the wordmark fills the screen, the
// tagline states the problem in one line, one button drops them into the app as a
// guest. Cold, raw, explains nothing. Type is the hero — bone-white on true black
// is the only accent; grain makes the black a material. No cards, no glow, no
// gradient, border-radius 0. The "27" reversed out of a --paper block is the one
// structural use of the house device. Everything else is space.
export default function LandingPage() {
  return (
    <main className="relative flex min-h-svh flex-col overflow-hidden px-6 py-16">
      <div aria-hidden className="grain-layer" />

      <div className="relative z-10 flex flex-1 flex-col justify-center">
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

      <div className="relative z-10">
        <Link
          href="/wardrobe"
          className={`${btnPrimary} reveal`}
          style={{ animationDelay: "240ms" }}
        >
          Try it now
        </Link>
      </div>
    </main>
  );
}
