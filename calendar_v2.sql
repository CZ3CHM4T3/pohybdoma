-- ============================================================
--  Můj kalendář v2 – vlastní kategorie (až 8, barva + název)
--  a události s časem a poznámkou.
--  Spustit v Supabase → SQL Editor (po calendar_notes.sql).
-- ============================================================

-- 1) Vlastní kategorie člena
create table if not exists public.calendar_categories (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text not null default 'Kategorie',
  color      text not null default 'sky',
  position   int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists calendar_categories_user_idx on public.calendar_categories (user_id, position);

alter table public.calendar_categories enable row level security;

drop policy if exists "cc select own" on public.calendar_categories;
create policy "cc select own" on public.calendar_categories
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "cc insert own" on public.calendar_categories;
create policy "cc insert own" on public.calendar_categories
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "cc update own" on public.calendar_categories;
create policy "cc update own" on public.calendar_categories
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "cc delete own" on public.calendar_categories;
create policy "cc delete own" on public.calendar_categories
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.calendar_categories to authenticated;

-- 2) Události: rozšíření calendar_notes
alter table public.calendar_notes add column if not exists category_id bigint references public.calendar_categories(id) on delete set null;
alter table public.calendar_notes add column if not exists at_time time;
alter table public.calendar_notes add column if not exists note text;

-- category (text) zůstává jako starší sloupec, nově se používá category_id.
