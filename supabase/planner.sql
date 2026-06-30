-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – PLÁNOVAČ: vlastní lekce admina (mimo klientské rezervace)
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
--  Vyžaduje funkci public.is_admin() z admin-policies.sql.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.lesson_plans (
  id          uuid primary key default gen_random_uuid(),
  date        date not null,
  time        text not null,
  client_name text not null default '',
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists lesson_plans_date_idx on public.lesson_plans (date);

alter table public.lesson_plans enable row level security;

grant select, insert, update, delete on public.lesson_plans to authenticated;

-- Jen admin (podle e-mailu v tokenu) může vlastní lekce číst i upravovat.
drop policy if exists "admin lesson_plans" on public.lesson_plans;
create policy "admin lesson_plans" on public.lesson_plans
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
