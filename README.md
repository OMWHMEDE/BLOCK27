# BLOCK27

An AI personal stylist. It reads what you already own, decides what you should
wear, and renders it on your own body.

Read `CLAUDE.md` first — it is the law this repo is built against.

This is **BUILD 01 — FOUNDATION**: accounts, auth, the private storage seam, the
phone-verification seam, and the `Hand` interface. No photos, no AI, no styling
yet. Nothing here calls a paid API.

## Stack

Next.js (App Router) + TypeScript · Supabase (Postgres/Auth/Storage) · Tailwind v4
· deploy on Vercel.

## Setup

1. `npm install`
2. Create a Supabase project (free tier).
3. Apply the migration in `supabase/migrations/0001_init.sql` (SQL editor, or
   `supabase db push`). It creates the schema, RLS policies, the signup trigger,
   and the private `user-photos` bucket.
4. In Supabase Auth settings, **turn off email confirmation** so signup lands
   straight in the app (the frictionless stranger flow).
5. `cp .env.example .env.local` and fill in the Supabase values.
6. `npm run dev`.

## Environment

See `.env.example`. `NEXT_PUBLIC_*` values are safe in the client bundle.
`SUPABASE_SERVICE_ROLE_KEY` is server-only and bypasses RLS — it is never used
by product code and must never carry a `NEXT_PUBLIC_` prefix.

## The seams

- **The hand** (`src/lib/hand/`) — every render provider hides behind the `Hand`
  interface. Product code calls `getHand()` and never learns the provider.
  Nothing outside `src/lib/hand/` may import a provider — enforced by ESLint.
- **Phone verification** (`src/lib/phone/`) — `StubVerifier` accepts `000000` in
  dev and throws in production. Wiring a real SMS provider touches one file.
- **Storage** (`src/lib/supabase/storage.ts`) — the `user-photos` bucket is
  private. `signedUrl()` is the only way to read it. No public object URLs.

## Scripts

| Script | What |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint (includes the hand-boundary rule) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Unit tests (hand, phone) + the RLS test |
| `npm run test:rls` | Just the RLS isolation test |

### The RLS test

`tests/rls.test.ts` proves user A cannot read, list, or modify user B's
garments. It runs against a **live** Supabase project with the migration
applied — point `.env.local` at a real project and run `npm run test:rls`. With
placeholder env values it **skips** (rather than pass a hollow assertion), so a
green RLS run always means the isolation was actually exercised.
