-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – OBSAH: videa v databázi (spravované z adminu)
--  Spusť v Supabase SQL Editoru. Předpoklad: is_admin() (admin-policies.sql).
--  Soubor videa žije na Cloudflare Stream; tady je jen metadata + cf_uid.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.videos (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null,
  description      text default '',
  body_parts       text[] default '{}',
  difficulty       text default 'začátečník',
  access_level     text not null default 'FREE',
  problem_types    text[] default '{}',
  equipment        text[] default '{}',
  tags             text[] default '{}',
  cf_uid           text,                 -- Cloudflare Stream UID (doplníš později)
  duration_seconds int default 0,
  caution          text,
  published        boolean not null default true,
  position         int,
  created_at       timestamptz not null default now()
);

alter table public.videos enable row level security;
grant select on public.videos to anon, authenticated;
grant insert, update, delete on public.videos to authenticated;

-- Veřejně se zobrazují jen zveřejněná videa
drop policy if exists "videos public read" on public.videos;
create policy "videos public read" on public.videos
  for select to anon, authenticated using (published = true);

-- Admin vidí a spravuje vše
drop policy if exists "videos admin all" on public.videos;
create policy "videos admin all" on public.videos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
