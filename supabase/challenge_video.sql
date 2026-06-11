-- Video u měsíční výzvy (Cloudflare UID) – pro občasné video-výzvy.
-- Spustit v Supabase → SQL Editor.
alter table public.challenges add column if not exists video_uid text;
