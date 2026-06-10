-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – VIP+ KLUB v4: obrázky v diskuzi
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
--  Předpoklad: community.sql + v2 + v3.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Sloupce pro obrázek ──────────────────────────────────────────────────
alter table public.community_posts    add column if not exists image_url text;
alter table public.community_comments  add column if not exists image_url text;

-- ── 2) Úložiště obrázků (bucket "community", veřejné čtení) ──────────────────
insert into storage.buckets (id, name, public)
values ('community', 'community', true)
on conflict (id) do nothing;

-- Nahrávat smí jen člen klubu
drop policy if exists "klub upload obrazky" on storage.objects;
create policy "klub upload obrazky" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'community' and public.is_club_member());

-- Čtení veřejné (bucket je public → funguje getPublicUrl)
drop policy if exists "klub cteni obrazky" on storage.objects;
create policy "klub cteni obrazky" on storage.objects
  for select to public
  using (bucket_id = 'community');

-- Mazat smí vlastník souboru
drop policy if exists "klub maze obrazky" on storage.objects;
create policy "klub maze obrazky" on storage.objects
  for delete to authenticated
  using (bucket_id = 'community' and owner = auth.uid());
