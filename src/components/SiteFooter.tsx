import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/support";
import { SocialLinks } from "@/components/SocialIcons";

// The marketing footer — support + socials, on the void ground with a single
// hairline rule and the emptiness the brand runs on. Socials are monochrome
// glyphs (SocialLinks), border-radius 0. Shown on the landing and pricing pages;
// the in-app tool screens stay uncluttered. Legal pages carry the same links via
// their own nav (see LegalShell).

const LEGAL = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Refund", href: "/refund" },
];

const linkClass =
  "uppercase tracking-[0.08em] text-bone hover:text-paper transition-colors duration-200";

export function SiteFooter() {
  return (
    <footer className="bg-void border-t border-iron px-8 py-16">
      <div className="mx-auto max-w-2xl flex flex-col gap-10">
        {/* Support — the one tappable email. */}
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.08em] text-ash">Support</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-mono text-sm text-paper hover:text-bone transition-colors duration-200"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>

        {/* Socials — monochrome glyphs, new tab, no referrer. */}
        <SocialLinks />

        {/* Legal + mark. */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-iron pt-8 text-sm">
          {LEGAL.map((l) => (
            <Link key={l.href} href={l.href} className={linkClass}>
              {l.label}
            </Link>
          ))}
          <span className="ml-auto font-mono text-xs uppercase tracking-[0.12em] text-ash">
            BLOCK27 &copy; 2026
          </span>
        </div>
      </div>
    </footer>
  );
}
