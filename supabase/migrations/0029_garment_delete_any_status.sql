-- 0029: confirm a user may delete their OWN garment rows at ANY status.
--
-- The app now lets people clear stalled uploads, which are rows left at status
-- 'pending' (or 'analyzing') when analysis never completed. This re-asserts the
-- delete policy so that is guaranteed and documented: a user may delete any of
-- their own garment rows regardless of status — pending, analyzing, analyzed or
-- rejected. The policy has never carried a status clause (it dates to 0001,
-- `using (auth.uid() = user_id)`); this makes the guarantee explicit and guards
-- against any future drift. Functionally identical to the existing policy, so
-- it changes no current behavior. Idempotent.

drop policy if exists "garments_delete_own" on public.garments;
create policy "garments_delete_own" on public.garments
  for delete using (auth.uid() = user_id);
