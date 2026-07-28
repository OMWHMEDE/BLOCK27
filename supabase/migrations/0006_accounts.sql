-- Accounts: a display name captured at signup and editable later.
--
-- Nothing else needs schema: the avatar reuses the existing private user-photos
-- bucket (its RLS already scopes the first path segment to auth.uid()), and the
-- piece limit is a counted value, not a column.

alter table public.users add column display_name text;

-- Capture display_name atomically at signup. signUp() writes it into the auth
-- metadata; the trigger reads it and stores it on public.users in the same
-- transaction as the row. Existing rows keep display_name = null (rendered as
-- "no name" in the UI). Only the function body changes; the trigger is unchanged.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, display_name)
    values (new.id, nullif(new.raw_user_meta_data->>'display_name', ''));
  insert into public.style_profile (user_id) values (new.id);
  return new;
end;
$$;
