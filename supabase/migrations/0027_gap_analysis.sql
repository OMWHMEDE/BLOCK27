-- 0027: stronger outfit gap — leverage per gap + the near-miss outfits.
--
-- 0015 added latest_gap (one line); 0016 added latest_gap_points (the list). This
-- adds the two structured outputs the composition worker now produces alongside
-- them, so the gap endpoint can return a real number and the almost-outfits:
--   latest_gap_details    — [{ "text": string, "unlocks": number }], one per gap
--                           point, unlocks = how many more coherent outfits one
--                           piece filling that gap would enable in THIS wardrobe.
--   latest_blocked_outfits— [{ "item_ids": [uuid], "missing": string }], the
--                           compositions the wardrobe almost makes — every piece
--                           present except one. item_ids are validated real ids.
--
-- Both nullable, same semantics as latest_gap_points: null until the first
-- generation, [] when there is nothing to report. Idempotent.

alter table public.users
  add column if not exists latest_gap_details    jsonb,
  add column if not exists latest_blocked_outfits jsonb;
