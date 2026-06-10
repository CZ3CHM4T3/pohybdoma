-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – LIVE streamy (VIP+). Spusť v Supabase SQL Editoru.
--  Předpoklad: is_club_member() (community.sql) + is_admin() (admin-policies.sql).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.streams (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text default '',
  embed_url     text,          -- živý stream (odkaz YouTube/Vimeo/Cloudflare)
  recording_url text,          -- záznam (dostupný ~týden)
  starts_at     timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

alter table public.streams enable row level security;
grant select on public.streams to authenticated;
grant insert, update, delete on public.streams to authenticated;

-- Čtení jen pro VIP+ (a admina)
drop policy if exists "streams read vip+" on public.streams;
create policy "streams read vip+" on public.streams
  for select to authenticated using (public.is_club_member());

-- Správa jen admin
drop policy if exists "streams admin all" on public.streams;
create policy "streams admin all" on public.streams
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
