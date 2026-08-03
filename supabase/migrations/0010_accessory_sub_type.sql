-- Accessories. 'accessory' is already an allowed garment category; this adds a
-- structured sub-type for the four typed kinds the eye now classifies —
-- glasses, watch, chain, bracelet — projected out of the analysis JSON into a
-- queryable column so the wardrobe and shop can filter on them without parsing
-- jsonb.
--
-- sub_type is NULL for every non-accessory garment, and for accessories that
-- aren't one of the four (a hat, belt, scarf). Accessories still count against
-- the same piece cap and flow through the same upload/analysis path — no new
-- limit or ingestion logic.

alter table public.garments
  add column if not exists sub_type text;

alter table public.garments
  drop constraint if exists garments_sub_type_check;
alter table public.garments
  add constraint garments_sub_type_check
  check (sub_type is null or sub_type in ('glasses', 'watch', 'chain', 'bracelet'));

-- Cheap lookups of a user's accessories by kind (the only rows with a sub_type).
create index if not exists garments_sub_type_idx
  on public.garments (user_id, sub_type)
  where sub_type is not null;
