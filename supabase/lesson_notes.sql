-- ════════════════════════════════════════════════════════════════════════════
--  PŘIPOMÍNKY K LEKCÍM V KALENDÁŘI (malý text v rámečku lekce).
--  Klik na lekci v rozvrhu → pole „Připomínka" → uloží se sem podle datumu a času.
--  Soukromé pro lektora (admin). Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.lesson_notes (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  time       text not null,
  note       text not null,
  created_at timestamptz not null default now(),
  unique (date, time)
);
create index if not exists lesson_notes_date_idx on public.lesson_notes (date);

alter table public.lesson_notes enable row level security;

drop policy if exists "admin lesson notes" on public.lesson_notes;
create policy "admin lesson notes" on public.lesson_notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
