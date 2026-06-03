-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – návrh databáze (Supabase / PostgreSQL)
--  Spustíš později v Supabase: SQL Editor → vlož → Run.
--  Zatím slouží jako příprava; doladíme při napojování.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Profily uživatelů (rozšiřují vestavěnou tabulku auth.users) ──────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  -- úroveň členství: free | member | vip | vip_plus
  tier text not null default 'free',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- ── Pravidelný týdenní rozvrh (stejný každý týden) ──────────────────────────
-- weekday: 0=Ne, 1=Po … 6=So
create table if not exists public.availability_weekly (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  time text not null,             -- "HH:MM"
  is_free boolean not null default false,
  unique (weekday, time)
);

-- ── Výjimky pro konkrétní datum ("pro tentokrát") ───────────────────────────
-- status: 'free' | 'booked'
create table if not exists public.availability_overrides (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  time text not null,
  status text not null check (status in ('free','booked')),
  unique (date, time)
);

-- ── Akce / workshopy ────────────────────────────────────────────────────────
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null,
  kind text not null default 'Akce',
  time text,
  location text,
  description text,
  price_kc integer,
  href text,
  created_at timestamptz not null default now()
);

-- ── Rezervace ───────────────────────────────────────────────────────────────
-- status: 'pending' | 'confirmed' | 'cancelled'
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  service_id text not null,
  service_name text not null,
  date date not null,
  time text not null,
  mode text not null,            -- 'online' | 'inPerson'
  municipality text,
  address text,
  reason text,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  price_kc integer not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════════
--  ZABEZPEČENÍ (Row Level Security) – základ, doladíme při napojení
-- ════════════════════════════════════════════════════════════════════════════
alter table public.profiles              enable row level security;
alter table public.availability_weekly   enable row level security;
alter table public.availability_overrides enable row level security;
alter table public.events                enable row level security;
alter table public.bookings              enable row level security;

-- Dostupnost a akce smí číst kdokoliv (zobrazují se v kalendáři):
drop policy if exists "verejne cteni rozvrhu" on public.availability_weekly;
create policy "verejne cteni rozvrhu"
  on public.availability_weekly for select using (true);

drop policy if exists "verejne cteni vyjimek" on public.availability_overrides;
create policy "verejne cteni vyjimek"
  on public.availability_overrides for select using (true);

drop policy if exists "verejne cteni akci" on public.events;
create policy "verejne cteni akci"
  on public.events for select using (true);

-- Rezervaci může vytvořit kdokoliv (i nepřihlášený host):
drop policy if exists "vytvoreni rezervace" on public.bookings;
create policy "vytvoreni rezervace"
  on public.bookings for insert with check (true);

-- Svoje rezervace vidí přihlášený uživatel:
drop policy if exists "ctu svoje rezervace" on public.bookings;
create policy "ctu svoje rezervace"
  on public.bookings for select using (auth.uid() = user_id);

-- Svůj profil vidí/edituje přihlášený uživatel:
drop policy if exists "ctu svuj profil" on public.profiles;
create policy "ctu svuj profil"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "edituji svuj profil" on public.profiles;
create policy "edituji svuj profil"
  on public.profiles for update using (auth.uid() = id);

-- POZN.: admin operace (správa rozvrhu, akcí, potvrzování rezervací) poběží
-- přes server se service_role klíčem, který RLS obchází. Doladíme při napojení.
