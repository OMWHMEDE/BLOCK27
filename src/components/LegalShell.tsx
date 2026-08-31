import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { SUPPORT_EMAIL } from "@/lib/support";
import { SocialLinks } from "@/components/SocialIcons";

// Shared frame for the legal pages (/terms, /privacy, /refund): wordmark home
// link, title, cold one-line intro, a "last updated" stamp, the clauses, and a
// footer that cross-links the three. Same tokens as the rest of the app — void
// ground, paper/bone/ash type, hairline sections, border-radius 0, no cards.
//
// NOTE: these pages are PLACEHOLDER legal copy — accurate to how the product
// actually works, but pending a real lawyer's review before full public launch.
// Do not treat as final legal advice.

// Bump when the substance of any legal page changes.
export const LEGAL_UPDATED = "4 August 2026";

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund", label: "Refund" },
];

export function LegalShell({
  title,
  intro,
  current,
  children,
}: {
  title: string;
  intro: string;
  current: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col px-8 py-16 max-w-2xl w-full mx-auto">
      <Link href="/" className="mb-16 inline-block">
        <Wordmark />
      </Link>

      <h1 className="text-4xl font-bold tracking-tight leading-[0.9] mb-3">
        {title}
      </h1>
      <p className="text-ash max-w-md mb-4 leading-snug">{intro}</p>
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-ash mb-12">
        Last updated {LEGAL_UPDATED}
      </p>

      {children}

      <nav className="mt-16 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-iron pt-8 text-sm">
        {LEGAL_LINKS.map((l) =>
          l.href === current ? (
            <span
              key={l.href}
              aria-current="page"
              className="uppercase tracking-[0.08em] text-ash"
            >
              {l.label}
            </span>
          ) : (
            <Link
              key={l.href}
              href={l.href}
              className="uppercase tracking-[0.08em] text-bone hover:text-paper"
            >
              {l.label}
            </Link>
          ),
        )}
        <Link
          href="/"
          className="uppercase tracking-[0.08em] text-bone hover:text-paper"
        >
          Home
        </Link>
      </nav>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="font-mono text-xs text-bone hover:text-paper"
        >
          {SUPPORT_EMAIL}
        </a>
        <SocialLinks />
      </div>
    </main>
  );
}

// One legal section — a hairline rule, a mono-ish label, and the body copy. The
// legal text itself stays plain and standard; only the framing carries voice.
export function Clause({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-iron pt-8 pb-10">
      <p className="text-xs uppercase tracking-[0.08em] text-ash mb-4">{label}</p>
      <div className="text-bone leading-relaxed max-w-xl space-y-4">
        {children}
      </div>
    </section>
  );
}
