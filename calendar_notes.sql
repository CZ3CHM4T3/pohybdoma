-- ============================================================
--  Osobní kalendář – poznámky/události člena (barevné kategorie)
--  Nezávislé na rezervacích (ty mají vlastní kalendář).
--  Spustit v Supabase → SQL Editor.
-- ============================================================

create table if not exists public.calendar_notes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  category   text not null default 'jine',
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists calendar_notes_user_day_idx on public.calendar_notes (user_id, day);

alter table public.calendar_notes enable row level security;

drop policy if exists "cn select own" on public.calendar_notes;
create policy "cn select own" on public.calendar_notes
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "cn insert own" on public.calendar_notes;
create policy "cn insert own" on public.calendar_notes
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "cn update own" on public.calendar_notes;
create policy "cn update own" on public.calendar_notes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "cn delete own" on public.calendar_notes;
create policy "cn delete own" on public.calendar_notes
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.calendar_notes to authenticated;
