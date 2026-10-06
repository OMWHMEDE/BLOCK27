// The master switch for the web APP. The product lives in the iOS app now; the
// website is a shopfront (landing + legal pages + a launch-email capture). This
// flag fails safe like PAYMENTS_OPEN / TRYON_OPEN, but with the opposite default:
// unset, empty, or anything other than the exact string "true" means the web app
// is CLOSED — so the default deploy is the shopfront, and the full web app
// (sign in / sign up, wardrobe, generation, shopping, the gap, pricing checkout,
// everything behind an account) only comes back when this is explicitly "true".
//
// It gates the BROWSER surface only. The API routes under /api/* stay on
// regardless — the iOS app talks to them — so this never takes the backend down,
// just the website's app pages. All that code stays in place behind the flag,
// the same way try-on was switched off, ready to switch back on with one env
// change and a redeploy.
//
// NOT marked `server-only`: this is imported by the request interceptor
// (src/proxy.ts → src/lib/supabase/middleware.ts), which runs in the edge
// middleware bundle. It reads a non-secret env flag, safe to evaluate anywhere.
export function webAppOpen(): boolean {
  return process.env.WEB_APP_OPEN === "true";
}
