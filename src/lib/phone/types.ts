// The phone-verification seam.
//
// Phone verification is required before any free render is spent — it kills
// throwaway-account farming. SMS costs money and we are not paying yet, so this
// is a seam, not an integration. Wiring a real provider later must touch exactly
// one file (see ./index.ts).

export interface PhoneVerifier {
  send(phone: string): Promise<{ ok: true } | { ok: false; reason: string }>;
  check(phone: string, code: string): Promise<boolean>;
}
