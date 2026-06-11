-- ============================================================
--  Finanční deník (jen admin): příjmy a výdaje webu.
--  Tržby z rezervací se počítají automaticky zvlášť (z bookings).
--  Spustit v Supabase → SQL Editor.
-- ============================================================

create table if not exists public.finance_entries (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('income','expense')),
  category   text not null,
  amount_kc  numeric not null check (amount_kc >= 0),
  note       text,
  at         date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists finance_entries_idx on public.finance_entries (kind, at desc);

alter table public.finance_entries enable row level security;

drop policy if exists "fin admin all" on public.finance_entries;
create policy "fin admin all" on public.finance_entries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.finance_entries to authenticated;
