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
- **Stripe** — payments. Not yet.

Free tier until users force otherwise. Weight is a design decision, not a bill.

---

## NON-NEGOTIABLE ENGINEERING RULES

1. **API keys live in the backend. Never in the client.** A key in frontend code is extracted in minutes and someone else spends the credits.
2. **Never call an image provider directly from product code.** Everything goes through the `Hand` interface. The provider must be swappable in one hour without touching a single product file.
3. **Analyze a garment with vision exactly once**, at upload. Convert to a dense text record. Reason over text forever after. Never send the photo to the brain again. This one decision is what makes the economics work — do not break it for convenience.
4. **Cache the wardrobe context.** Repeated cost drops ~90%.
5. **Every render is maximum quality. Every one.** No "standard" tier as a cost optimization. If cost bites, cap volume — never cut quality.
6. **Never charge a user for a failed render.** Failures don't count against free renders or the fair-use cap.
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

Price: **$24.99/mo.** Free renders: **3, lifetime** — not monthly, no reset to farm. Pro fair-use: ~25 outfits/month.

---

## BUILD ORDER — do not skip ahead

1. **Backend, auth, phone-verification seam, the `Hand` interface** ← we are here
2. Guided base photo capture — the strict gate
3. Wardrobe capture + garment analysis
4. Outfit reasoning — the brain
5. Layered render + silent regeneration + upscale
6. Five items, then render immediately
7. 3 free renders, then Stripe
8. Privacy hardening

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
