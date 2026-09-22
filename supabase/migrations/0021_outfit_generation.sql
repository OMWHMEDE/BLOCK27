-- Outfit generations — the swap that keeps the old set visible until the new one
-- is ready.
--
-- Generating outfits used to delete the whole set and re-insert, leaving the
-- wardrobe empty for the length of a reasoning call. Now each run writes its
-- outfits into a NEW generation while the old generation stays published and
-- visible; only when the run finishes does the pointer move and the old rows go.
-- A background worker streams the new outfits in one at a time, so the user sees
-- them appear.
--
--   outfits.generation           — which batch a row belongs to.
--   users.outfits_generation     — the PUBLISHED batch. Rows at this generation
--                                  are the current visible set; rows at a higher
--                                  generation are an in-progress draft, streaming.
--
-- Existing rows default to generation 0 and the pointer defaults to 0, so nothing
-- changes until the first async run. Idempotent.

alter table public.outfits
  add column if not exists generation bigint not null default 0;

create index if not exists outfits_user_generation_idx
  on public.outfits (user_id, generation);

alter table public.users
  add column if not exists outfits_generation bigint not null default 0;

-- The swap. Publish the new generation and drop every other one (the old
-- published set, plus any stale drafts) in a single statement pair so the set is
-- never empty and never shows two generations at once. Service-role only — the
-- worker runs it with an explicit user id.
create or replace function public.swap_outfit_generation(
  p_user_id uuid,
  p_new_gen bigint
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
    set outfits_generation = p_new_gen
  where id = p_user_id;

  delete from public.outfits
  where user_id = p_user_id
    and generation <> p_new_gen;
end;
$$;

revoke all on function public.swap_outfit_generation(uuid, bigint) from public;
grant execute on function public.swap_outfit_generation(uuid, bigint) to service_role;
