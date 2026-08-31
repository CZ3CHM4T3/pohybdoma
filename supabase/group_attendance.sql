-- ════════════════════════════════════════════════════════════════════════════
--  SKUPINOVÉ LEKCE: soupiska lidí + docházka.
--   • block_members     = kdo do skupiny (PPT, KRUHÁČ, MS GEM…) chodí (nemusí být člen webu)
--   • block_attendance  = kdo byl na konkrétním výskytu (den) přítomen
--  Skupiny samotné jsou v recurring_blocks (recurring_blocks.sql).
--  Předpoklad: recurring_blocks.sql, public.is_admin(). Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

-- Soupiska (kdo do skupiny patří)
create table if not exists public.block_members (
  id         uuid primary key default gen_random_uuid(),
  block_id   uuid not null references public.recurring_blocks (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (block_id, name)
);
create index if not exists block_members_block_idx on public.block_members (block_id);

alter table public.block_members enable row level security;
drop policy if exists "admin block members" on public.block_members;
create policy "admin block members" on public.block_members
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Docházka (kdo byl přítomen v daný den) – řádek = přítomen
create table if not exists public.block_attendance (
  id         uuid primary key default gen_random_uuid(),
  block_id   uuid not null references public.recurring_blocks (id) on delete cascade,
  date       date not null,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (block_id, date, name)
);
create index if not exists block_attendance_block_idx on public.block_attendance (block_id, date);

alter table public.block_attendance enable row level security;
drop policy if exists "admin block attendance" on public.block_attendance;
create policy "admin block attendance" on public.block_attendance
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
