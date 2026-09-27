import "server-only";

// The master switch for the hand (virtual try-on) as a whole. Fails safe like
// PAYMENTS_OPEN: unset, empty, or anything other than the exact string "true"
// reads as CLOSED, so a missing or fat-fingered env keeps try-on off. One env
// var, flipped and redeployed — a single reversible step, no code change.
//
// When closed, the render route refuses for everyone, and the base-photo capture
// and biometric-consent flows are unreachable (their upload/record paths refuse
// and their entry screens are hidden). Deletion paths stay open — a user can
// always destroy their biometric data. All the try-on code stays in place; this
// is a launch gate, meant to be turned back on later without a deploy of code,
// only a redeploy to pick up the flipped env.
//
// Server-only on purpose: the flag is not public. Client components that need it
// receive it as a prop from their server parent, never as a NEXT_PUBLIC env.
export function tryOnOpen(): boolean {
  return process.env.TRYON_OPEN === "true";
}
