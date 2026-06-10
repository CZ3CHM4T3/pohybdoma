-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – odběratelé newsletteru
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;

-- Přihlásit se k odběru může kdokoliv (insert)
drop policy if exists "verejne prihlaseni newsletter" on public.subscribers;
create policy "verejne prihlaseni newsletter" on public.subscribers
  for insert with check (true);
grant insert on public.subscribers to anon, authenticated;

-- Seznam e-mailů vidí jen admin
drop policy if exists "admin cte odberatele" on public.subscribers;
create policy "admin cte odberatele" on public.subscribers
  for select to authenticated using (public.is_admin());

-- Admin může odběratele i mazat (odhlášení na vyžádání)
drop policy if exists "admin maze odberatele" on public.subscribers;
create policy "admin maze odberatele" on public.subscribers
  for delete to authenticated using (public.is_admin());

grant select, delete on public.subscribers to authenticated;
