-- Model output occasionally leaked markup — stray tags, or fragments of the
-- assistant's own tool-call syntax (e.g. antml parameter tags) — into free-text
-- fields. reject_reason and photo_warning are shown to users, so this text must
-- be clean. The analyzer now strips markup at the source (analyzeGarment.ts);
-- this migration cleans the rows written before that fix.
--
-- Idempotent: each statement only touches rows whose value still contains an
-- angle bracket, and stripping already-clean text is a no-op.

-- reject_reason (top-level column): drop tag-like sequences, collapse the
-- whitespace they leave behind, and null out anything that was markup-only.
update public.garments
set reject_reason =
  nullif(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(reject_reason, '<[^>]*>', ' ', 'g'),
          '<[^>]*$', ' ', 'g'),
        '\s+', ' ', 'g')
    ),
    ''
  )
where reject_reason is not null
  and reject_reason ~ '[<>]';

-- A rejected garment must always carry an actionable reason; restore a plain one
-- wherever cleaning emptied it (or it was already blank).
update public.garments
set reject_reason =
  'That photo won''t work. Shoot it again — flat, even light, whole garment in frame.'
where status = 'rejected'
  and (reject_reason is null or btrim(reject_reason) = '');

-- photo_warning (inside the analysis jsonb): same strip, written back in place.
update public.garments
set analysis = jsonb_set(
  analysis,
  '{photo_warning}',
  to_jsonb(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(analysis->>'photo_warning', '<[^>]*>', ' ', 'g'),
          '<[^>]*$', ' ', 'g'),
        '\s+', ' ', 'g')
    )
  )
)
where analysis ? 'photo_warning'
  and coalesce(analysis->>'photo_warning', '') ~ '[<>]';
