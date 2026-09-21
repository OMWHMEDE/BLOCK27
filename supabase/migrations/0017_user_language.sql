-- Language preference for AI output. Every brain call — garment analysis, outfit
-- composition + reasoning, the gap / gap_points, and the shopping advice + picks
-- — reads this and responds in the user's language. Machine values (the enum
-- fields, retail search queries) stay English. Default English; the app sets it
-- via POST /api/account/language.

alter table public.users
  add column if not exists language text not null default 'en';

alter table public.users
  drop constraint if exists users_language_check;
alter table public.users
  add constraint users_language_check check (language in ('en', 'fr', 'ar'));
