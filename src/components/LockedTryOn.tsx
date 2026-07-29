import Link from "next/link";

// The house device, made literal: a solid --paper block redacting the figure.
// Where the render would be — you, in the outfit — there is a hard slab and a
// price. This is the paywall for the hand. No render ever happens behind it;
// it is the absence of one. Cold, no card, border-radius 0, reversed type.
export function LockedTryOn({
  headline,
  href,
  cta,
}: {
  headline: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="relative mx-auto w-full max-w-xs">
      <div className="relative aspect-[3/4] w-full overflow-hidden border border-iron bg-void">
        {/* The slab. It sits across the lower two-thirds, redacting the body. */}
        <div className="absolute inset-x-0 bottom-0 top-1/3 flex flex-col justify-center gap-5 bg-paper px-6 py-6 text-void">
          <p className="text-[0.7rem] uppercase tracking-[0.24em] text-void/70">
            Locked
          </p>
          <p className="text-xl font-bold leading-[1.05] tracking-[-0.01em]">
            {headline}
          </p>
          <Link
            href={href}
            className="inline-flex w-fit items-center justify-center bg-void px-6 py-3 text-sm uppercase tracking-[0.08em] text-paper transition transform-gpu duration-100 ease-out hover:bg-iron active:scale-[0.96] motion-reduce:active:scale-100"
          >
            {cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
