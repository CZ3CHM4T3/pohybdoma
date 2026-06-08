-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – MOJE CESTA: zrušení členství + Můj deník (tracker)
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Zrušení vlastního členství (přepne na FREE) ─────────────────────────────
create or replace function public.cancel_my_membership()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
    set tier = 'free', tier_since = null, tier_until = null
    where id = auth.uid();
end;
$$;
grant execute on function public.cancel_my_membership() to authenticated;

-- ── Můj deník: jeden záznam na den a uživatele ──────────────────────────────
create table if not exists public.diary_entries (
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  weight     numeric,        -- kg
  pain       smallint,       -- 1–10
  energy     smallint,       -- 1–100
  sleep      smallint,       -- 1–10
  symptoms   text,
  food       text,
  training   text,           -- co dnes cvičil (prvky)
  note       text,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.diary_entries enable row level security;
grant select, insert, update, delete on public.diary_entries to authenticated;

drop policy if exists "denik select" on public.diary_entries;
create policy "denik select" on public.diary_entries
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "denik insert" on public.diary_entries;
create policy "denik insert" on public.diary_entries
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "denik update" on public.diary_entries;
create policy "denik update" on public.diary_entries
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "denik delete" on public.diary_entries;
create policy "denik delete" on public.diary_entries
  for delete to authenticated using (auth.uid() = user_id);
