// Support contact + the warm, generic failure messages shown to users.
//
// The rule (unchanged): a user-facing error NEVER leaks a technical, billing,
// credit, or provider detail. These two strings are the only thing shown when
// something breaks on our side — the real cause is logged server-side, never
// sent to the screen. Client-safe (no server imports) so both API routes and
// client components import the same source of truth.

export const SUPPORT_EMAIL = "supportblock27@gmail.com";

// The public social handles — one source of truth for the footer and the legal
// pages so the two never drift.
export const SOCIAL_LINKS = [
  { label: "TikTok", href: "https://www.tiktok.com/@block27.app" },
  { label: "Instagram", href: "https://www.instagram.com/block27.app" },
  { label: "YouTube", href: "https://www.youtube.com/@BLOCK27-w7t" },
] as const;

// Transient / worth-retrying (a provider hiccup, a timeout, a network blip).
export const ERR_RETRY = `Something's off. Try again in a minute — if it keeps up, reach us at ${SUPPORT_EMAIL}.`;

// A generic failure that a retry probably won't fix — point them at support.
export const ERR_GENERIC = `Something's off on our end. Reach us at ${SUPPORT_EMAIL}.`;
