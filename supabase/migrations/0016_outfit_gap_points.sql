-- The outfit gap, as distinct points. The generate route already persists the
-- single-line latest_gap (0015); this adds the structured list so a client can
-- reveal the gaps one at a time. Nullable, same semantics as latest_gap: null
-- means "never generated", an empty array means the last composition had no gap.

alter table public.users
  add column if not exists latest_gap_points jsonb;
