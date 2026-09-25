# BLOCK27

An AI personal stylist. It reads what you already own, decides what you should wear, and renders it on your own body.

**One line:** You own good clothes. You wear them wrong.

---

## THE FOUNDING LAW

**The brain rules. The hand executes.**

- **Brain** = Claude. Sees, reasons, decides, speaks. Owns wardrobe understanding, taste, outfit logic, shopping strategy, personality.
- **Hand** = the image model. Renders a decision that was already made. It knows nothing. It has no opinion. It is a brush.

**The hand never chooses.** Not once, not as a shortcut, not to save an API call. The moment the image model makes a styling decision, this product becomes every other app on the store.

If the brain is removed, this is a photo filter. If the hand is removed, this still works — it just loses the payoff. That asymmetry is where the value is.

---

## STACK

- **Next.js (App Router) + TypeScript** — one repo. API routes are the backend.
- **Supabase** — Postgres, Auth, Storage (private buckets, signed URLs).
- **Vercel** — hosting, free tier.
- **Whop + Apple in-app purchase** — payments, through one shared entitlement writer so the two never conflict. Gated by the `PAYMENTS_OPEN` env flag. (Stripe is not used.)

Free tier until users force otherwise. Weight is a design decision, not a bill.

---

## NON-NEGOTIABLE ENGINEERING RULES

1. **API keys live in the backend. Never in the client.** A key in frontend code is extracted in minutes and someone else spends the credits.
2. **Never call an image provider directly from product code.** Everything goes through the `Hand` interface. The provider must be swappable in one hour without touching a single product file.
3. **Analyze a garment with vision exactly once**, at upload. Convert to a dense text record. Reason over text forever after. Never send the photo to the brain again. This one decision is what makes the economics work — do not break it for convenience.
4. **Cache the wardrobe context.** Repeated cost drops ~90%.
5. **Every render is maximum quality. Every one.** No "standard" tier as a cost optimization. If cost bites, cap volume — never cut quality.
6. **Never charge a user for a failed render.** Failures don't count against the try-on cap. (Mechanically: the render quota is reserved before the provider call and refunded on any failure — synchronously, or on terminal failure of the background job. See the async-jobs section.)
7. **The user never witnesses a failure.** The brain reviews every render before display. On failure, discard and re-run silently. Cap 2 retries, then offer a new base capture. A refusal is recoverable; a distorted face is not.

---

## PRIVACY — THIS IS BODY PHOTOGRAPHY

Treat every user photo as the most sensitive data the company holds. One incident ends the brand permanently.

- Encrypted at rest and in transit.
- **Private buckets only. Signed, short-lived URLs.** Never a public object URL.
- **Real deletion means real deletion** — the row and the file, not a soft-delete flag.
- **No admin screen that displays a user photo. Ever.** Do not build the tool that makes a breach easy.
- Photos are never training data. Never sold. Never shared.
- The promise is: *no human sees your photos in normal operation, and no tool exists that would make it easy.* Do not overpromise beyond that — an absolute claim we can't keep is worse than a modest one we can.

---

## THE VOICE — read before writing ANY user-facing string

Certain. Brief. Unsentimental. It never asks for approval. It never flatters.

**It is on the user's side, against bad clothes — never against the user.** The villain is the outfit. The user is being rescued. Never insult the body.

- NO emoji. NO exclamation marks. NO "I think this might look nice!"
- YES: "The bomber's doing the work. Everything under it stays flat so it reads as a decision, not an accident."
- An honest *"you don't own shoes for this"* is worth more than a bad outfit.

---

## VISUAL

- `--void` `#000000` · `--paper` `#F2F0EC` · `--blood` `#7A1F14` (emergency only, never decorative, max one per screen)
- No gradients. No glow. No neon. No shadows. **border-radius: 0.**
- Emptiness carries the confidence. If it feels like something's missing, it's working.

---

## COST MODEL — design against these

| Action | Cost |
|---|---|
| Analyze a garment (vision, once ever) | ~$0.005 |
| Compose an outfit | ~$0.01–0.02 |
| Shopping consultation | ~$0.03–0.05 |
| One max-tier render layer | ~$0.30 |
| Full outfit (~3 layers) | ~$0.90 |

**The brain is cents. The hand is real money. Reason freely, render deliberately.**

### Plans (the shipped model — source of truth is `@/lib/whop/plans`)

Four tiers. Every allowance is per-tier and metered over a **billing-anchored**
monthly window (from purchase time, not the calendar month). Caps are enforced
server-side via `usage_counters` (reserve/refund), never trusted to the client.

| Tier | $/mo | Pieces | Try-ons/mo | Generations/mo | Shop consults/mo |
|---|---|---|---|---|---|
| Free | 0 | 15 | **0** | 10 | 10 |
| Premium | 14.99 | 30 | 5 | 30 | 60 |
| Pro | 24.99 | 60 | 10 | 60 | 120 |
| Boss | 49.99 | 100 | 20 | 150 | 200 |

**The hand is paid-only.** Free gets the brain (analysis, outfits, shopping) but
**0 try-ons** — rendering yourself on your own body is the paid payoff. There is
no "free renders, lifetime" grant; that earlier model is retired. `PAID_OVERRIDE_UIDS`
is a per-account testing allowlist that turns every cap off (Boss limits, `exempt`).

---

## ASYNC JOBS — the backend spine

The long operations (outfit generation, try-on render, shopping) run as
background **jobs**, not on the request — a synchronous 15–300s call hits the
Vercel function cap and 504s. Garment analysis predates this and uses its own
status-column + client-poll driver.

**Full docs: `src/lib/jobs/README.md`. Read it before touching any of this.** In short:

- A row in the `jobs` table is the queue. The request reserves quota, enqueues,
  and runs the worker **in-process via `after()`** (no HTTP self-fetch — that was
  removed for leaving jobs stuck `queued`; do not reintroduce it). The client
  polls a `GET ...?job=<id>` status endpoint, nudged by Supabase Realtime on
  `jobs` with **polling as the guarantee**.
- Quota is refunded on terminal failure (`release_usage_admin`), so a failed
  background job never burns an allowance — this is how rule 6 holds off-request.
- **Render is stepped**: one garment **layer per invocation**, resumable from the
  last completed layer. **Generation streams**: outfits appear one at a time and
  the new set swaps in atomically only when ready, so the old set never blinks out.
- A daily `jobs/drain` cron reaps abandoned jobs and refunds their quota.

---

## BIOMETRIC CONSENT — required before the hand runs

The base photo and every render are biometric data (BIPA/GDPR). Enforced
server-side, not just in the UI:

- **Versioned, adult-attested consent.** `@/lib/biometric` holds `CONSENT_VERSION`
  and `CONSENT_TEXT`. A user must have a consent row for the *current* version with
  an 18-or-older attestation. Bump the version → prior consent no longer counts and
  everyone re-consents. The consent table is append-only (audit); IP is captured
  server-side, never from the body.
- **Gated at the source.** Base-photo upload and the render route both refuse
  (`403 { consentRequired, version }`) without current consent. `POST /api/account/consent`
  records it.
- **Real destruction, three triggers.** Base photo + all renders are deleted
  immediately when the user removes their base photo or deletes their account, and
  automatically after 12 months of inactivity (the `retention/biometric` cron).
  Keep `CONSENT_VERSION` / `CONSENT_TEXT` / the privacy-policy clause in lockstep.

---

## BUILD ORDER — do not skip ahead

1. ~~Backend, auth, phone-verification seam, the `Hand` interface~~ ✓
2. ~~Guided base photo capture — the strict gate~~ ✓
3. ~~Wardrobe capture + garment analysis~~ ✓
4. ~~Outfit reasoning — the brain~~ ✓
5. ~~Layered render + silent regeneration~~ ✓
6. ~~Five items, then render immediately~~ ✓
7. ~~Paywall + tiers~~ ✓ (Whop + Apple IAP, `PAYMENTS_OPEN` flag — not Stripe)
8. ~~Privacy hardening — biometric consent + retention~~ ✓

The v1 path above is built. Since then: the long operations were moved
**off the request onto the async jobs system** (see the async-jobs section), and
the wardrobe/vision path was tuned (thumbnails, pre-vision downscale). Upscale
(item 5) is still not built.

**Ships when:** a stranger goes from install to seeing himself in a good outfit, with no help from the founder.

### NOT NOW. Do not build these.
Marketplace. Human stylists. Womenswear (menswear only for v1 — half the work, twice the accuracy). Social feed. Any "AI-powered" anything that isn't on the list above.

---

## HOW TO WORK IN THIS REPO

- Small commits. One concern each.
- No TODOs left in shipped code.
- No mock data in anything that touches a real path.
- If a decision isn't specified here, **make the decision and state it in the commit message.** Don't ask.
- Before saying something is done: does it work for a stranger, on a phone, with no explanation? If not, it isn't done.
