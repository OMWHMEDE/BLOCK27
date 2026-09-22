-- Garment thumbnails. The wardrobe grid renders tiny 3-column tiles but was
-- signing the FULL-size garment photo for each — a 2k image downloaded to paint a
-- thumbnail, on a phone. We now generate a small thumbnail at upload (sharp) and
-- store it alongside the original; the grid serves the thumbnail, the detail page
-- and the render pipeline keep the full-size original.
--
-- thumb_path is nullable: older garments (and any upload where the best-effort
-- thumbnail step failed) have none, and the grid falls back to the full photo for
-- those. Supabase server-side image transforms are a Pro-plan feature, so we do
-- the resize ourselves at upload to stay on the free tier. Idempotent.

alter table public.garments
  add column if not exists thumb_path text;
