import Link from "next/link";

// The dedicated settings control: a circular button, opposite the wordmark. The
// circle is drawn in SVG — the app forces border-radius:0 on every element, so a
// real circle has to be a shape, not a CSS corner. Inside, a flat geometric gear
// in --paper on a thin --iron ring. No glow, no shadow. It presses like every
// other control (scale on active, --ease).
export function SettingsButton() {
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      className="group inline-flex shrink-0 transition transform-gpu duration-100 ease-out active:scale-[0.94] motion-reduce:active:scale-100"
    >
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
        <circle
          cx="20"
          cy="20"
          r="19"
          strokeWidth="1"
          className="stroke-iron transition-colors group-hover:stroke-paper"
        />
        <g
          transform="translate(20 20) scale(0.72) translate(-12 -12)"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-paper"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </g>
      </svg>
    </Link>
  );
}
