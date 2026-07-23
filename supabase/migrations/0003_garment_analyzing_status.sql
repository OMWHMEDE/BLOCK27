-- Add an 'analyzing' status. The analyze endpoint claims a garment by moving it
-- pending -> analyzing atomically, so vision runs exactly once per garment even
-- if the trigger fires more than once. Statuses: pending -> analyzing ->
-- analyzed (or rejected).

alter table public.garments
  drop constraint if exists garments_status_check;

alter table public.garments
  add constraint garments_status_check
  check (status in ('pending', 'analyzing', 'analyzed', 'rejected'));
