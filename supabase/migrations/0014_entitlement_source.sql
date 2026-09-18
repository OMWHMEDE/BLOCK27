-- Multi-provider billing. Until now Whop was the only writer of plan_tier /
-- subscription_status. Apple in-app purchase is coming, so record WHICH provider
-- owns a user's entitlement, and give Apple its own reference columns rather than
-- overloading whop_membership_id. entitlement_source lets each provider's webhook
-- revoke only what it granted, so the two systems never clobber each other.
--
-- Reads are unaffected: getPlan still resolves from plan_tier / subscription_status
-- / plan_anchor_at. This only adds ownership metadata on the write side.

alter table public.users
  add column if not exists entitlement_source text not null default 'none',
  add column if not exists apple_original_transaction_id text,
  add column if not exists apple_product_id text;

alter table public.users
  drop constraint if exists users_entitlement_source_check;
alter table public.users
  add constraint users_entitlement_source_check
  check (entitlement_source in ('none', 'whop', 'apple'));

-- Backfill: every currently-entitled row was granted by Whop (the only writer to
-- date), so mark it 'whop'. This is REQUIRED before the source-guarded revoke
-- ships — without it a Whop revoke would no longer match these rows and would
-- leave them paid. Everyone else stays 'none' (the default).
update public.users
set entitlement_source = 'whop'
where entitlement_source = 'none'
  and (
    plan_tier <> 'free'
    or subscription_status <> 'none'
    or whop_membership_id is not null
  );

-- Look up an Apple subscription by its stable original transaction id, mirroring
-- the whop_membership_id index.
create index if not exists users_apple_original_transaction_id_idx
  on public.users (apple_original_transaction_id)
  where apple_original_transaction_id is not null;
