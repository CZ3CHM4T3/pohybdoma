-- ════════════════════════════════════════════════════════════════════════════
--  MIMOŘÁDNÉ POLOŽKY NA FAKTUŘE (extra k danému člověku a měsíci).
--  Např. hodina/služba, co nebyla v kalendáři, nebo člověk jen tento měsíc.
--  Přičte se k jeho vyúčtování za daný měsíc.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.invoice_extras (
  id         uuid primary key default gen_random_uuid(),
  month      text not null,            -- "YYYY-MM"
  client     text not null,            -- komu (jméno; může být i nový člověk)
  label      text not null,            -- název položky
  amount_kc  integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists invoice_extras_month_idx on public.invoice_extras (month);

alter table public.invoice_extras enable row level security;
drop policy if exists "admin invoice extras" on public.invoice_extras;
create policy "admin invoice extras" on public.invoice_extras
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
