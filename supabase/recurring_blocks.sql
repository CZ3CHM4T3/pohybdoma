-- ════════════════════════════════════════════════════════════════════════════
--  Pravidelné BLOKY (MS GEM akademie, kruhový trénink, kroužek, příprava tenistů…)
--  Den v týdnu + rozsah od–do + název. Vyblokují kalendář (nikdo si tam nezarezervuje),
--  zobrazí se šedě jako "blok" a NEPOČÍTAJÍ se do faktur klientů (peníze si zapisuješ
--  ručně ve Faktury → Příjmy odjinud).
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.recurring_blocks (
  id          uuid primary key default gen_random_uuid(),
  weekday     smallint not null check (weekday between 0 and 6), -- 0=Ne … 6=So
  start_time  text not null,   -- "HH:MM"
  end_time    text not null,   -- "HH:MM"
  label       text not null default 'Blok',
  category    text not null default 'jine', -- msgem | tenis | skolka | krouzek | kruhac | jine
  note        text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.recurring_blocks add column if not exists category text not null default 'jine';
create index if not exists recurring_blocks_wd_idx on public.recurring_blocks (weekday);

alter table public.recurring_blocks enable row level security;

drop policy if exists "admin bloky" on public.recurring_blocks;
create policy "admin bloky" on public.recurring_blocks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── busy_times: obsazené termíny = rezervace + vlastní lekce + opakované lekce
--    (mimo zrušené) + pravidelné bloky. Bloky rozpočítáme na celé hodiny, kterých
--    se rozsah dotkne (14:30–15:30 → blokuje 14:00 i 15:00). ──
create or replace function public.busy_times(p_from date, p_to date)
returns table(date date, "time" text)
language sql
security definer
set search_path = public
stable
as $$
  select b.date, b.time
    from public.bookings b
   where b.status <> 'cancelled' and b.date between p_from and p_to
  union
  select l.date, l.time
    from public.lesson_plans l
   where l.date between p_from and p_to
  union
  select g.d::date, r.time
    from public.recurring_lessons r
    cross join generate_series(p_from, p_to, interval '1 day') g(d)
   where r.active
     and extract(dow from g.d)::int = r.weekday
     and not exists (
       select 1 from public.recurring_cancellations c
        where c.recurring_id = r.id and c.date = g.d::date
     )
  union
  select g.d::date, lpad(hr::text, 2, '0') || ':00'
    from public.recurring_blocks bl
    cross join generate_series(p_from, p_to, interval '1 day') g(d)
    cross join generate_series(
      extract(hour from bl.start_time::time)::int,
      extract(hour from bl.end_time::time)::int
        - (case when extract(minute from bl.end_time::time) = 0 then 1 else 0 end),
      1
    ) hr
   where bl.active
     and extract(dow from g.d)::int = bl.weekday
$$;
