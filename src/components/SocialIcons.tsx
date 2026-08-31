import { SOCIAL_LINKS } from "@/lib/support";

// Monochrome social glyphs — line-drawn, single-colour (currentColor), never the
// official gradient/red brand marks. They inherit the footer's bone text and go
// to paper on hover, so they read as part of the cold system, not stickers on
// black. One shared component so the footer and the legal pages never drift.

const ICON: Record<string, React.ReactNode> = {
  Instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  YouTube: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="3.5" />
      <path d="M10.5 9.3l5 2.7-5 2.7z" fill="currentColor" stroke="none" />
    </>
  ),
  // TikTok reads best as a solid glyph; drawn filled rather than stroked so the
  // note stays legible at 20px.
  TikTok: (
    <path
      d="M16.6 3c.25 1.94 1.5 3.42 3.4 3.62v2.4a5.6 5.6 0 0 1-3.4-1.06v5.5a5.1 5.1 0 1 1-5.1-5.1c.28 0 .55.02.82.07v2.48a2.65 2.65 0 1 0 1.85 2.53V3h2.43z"
      fill="currentColor"
      stroke="none"
    />
  ),
};

export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label="Social"
      className={`flex flex-wrap items-center gap-x-5 gap-y-3 ${className}`}
    >
      {SOCIAL_LINKS.map((s) => (
        <a
          key={s.label}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.label}
          className="text-bone transition-colors duration-200 hover:text-paper"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {ICON[s.label]}
          </svg>
          <span className="sr-only">{s.label}</span>
        </a>
      ))}
    </nav>
  );
}
