-- ════════════════════════════════════════════════════════════════════════════
--  ZMĚNY CENY V ČASE (ceník).
--  Když se změní cena služby (např. PPT po přechodu do haly), nastaví se nová
--  cena OD data. Lekce před tím datem se počítají starou cenou, od data novou.
--  Cena pro konkrétní lekci = poslední změna s from_date <= datum lekce,
--  jinak základní cena v service_catalog.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.service_price_history (
  service_key text not null,
  from_date   date not null,
  price       integer not null,
  primary key (service_key, from_date)
);
alter table public.service_price_history enable row level security;
drop policy if exists "admin price history" on public.service_price_history;
create policy "admin price history" on public.service_price_history
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
