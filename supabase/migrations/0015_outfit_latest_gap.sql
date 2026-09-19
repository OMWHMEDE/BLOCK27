-- Persist the latest outfit-composition gap so a client can show "what your
-- wardrobe can't do" without re-running a generation. One value per user, no
-- history: the generate route overwrites it on each successful composition, and
-- GET /api/outfits/gap reads it back. getPlan and every other read are unaffected.
--
-- Nullable on purpose: null means "never generated", an empty string means the
-- last composition had no gap (the wardrobe served the request).

alter table public.users
  add column if not exists latest_gap text,
  add column if not exists latest_gap_at timestamptz;
