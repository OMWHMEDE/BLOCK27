-- Re-assert that the jobs kind constraints permit 'shopping'.
--
-- 0020 already defines both checks with all three kinds; this is belt-and-braces
-- for any environment whose deployed constraint predates that (which would make
-- enqueue_job reject a shopping job and POST /api/shopping fail before a row is
-- ever written). Idempotent — a no-op where 0020 is current.

alter table public.jobs drop constraint if exists jobs_kind_check;
alter table public.jobs add constraint jobs_kind_check
  check (kind in ('render', 'composition', 'shopping'));

alter table public.jobs drop constraint if exists jobs_reserved_kind_check;
alter table public.jobs add constraint jobs_reserved_kind_check
  check (reserved_kind is null or reserved_kind in ('render', 'composition', 'shopping'));
