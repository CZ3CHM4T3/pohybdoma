-- ════════════════════════════════════════════════════════════════════════════
--  ZRUŠENÍ KONKRÉTNÍHO VÝSKYTU BLOKU (skupinovka/MS GEM/akademie v daný den není).
--  Zrušený výskyt se v kalendáři neukáže, uvolní termín a nepočítá se do
--  odtrénovaných hodin.
--  Předpoklad: recurring_blocks.sql. Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.recurring_block_cancellations (
  id         uuid primary key default gen_random_uuid(),
  block_id   uuid not null references public.recurring_blocks (id) on delete cascade,
  date       date not null,
  created_at timestamptz not null default now(),
  unique (block_id, date)
);
create index if not exists rbc_block_idx on public.recurring_block_cancellations (block_id, date);

alter table public.recurring_block_cancellations enable row level security;

drop policy if exists "admin ruseni bloku" on public.recurring_block_cancellations;
create policy "admin ruseni bloku" on public.recurring_block_cancellations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- busy_times znovu – bloky nyní vynechávají zrušené výskyty
create or replace function public.busy_times(p_from date, p_to date)
returns table(date date, "time" text)
language sql security definer set search_path = public stable
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
     and not exists (select 1 from public.recurring_cancellations c where c.recurring_id = r.id and c.date = g.d::date)
  union
  select g.d::date, lpad(hr::text, 2, '0') || ':00'
    from public.recurring_blocks bl
    cross join generate_series(p_from, p_to, interval '1 day') g(d)
    cross join generate_series(
      extract(hour from bl.start_time::time)::int,
      extract(hour from bl.end_time::time)::int - (case when extract(minute from bl.end_time::time) = 0 then 1 else 0 end),
      1
    ) hr
   where bl.active
     and extract(dow from g.d)::int = bl.weekday
     and not exists (select 1 from public.recurring_block_cancellations bc where bc.block_id = bl.id and bc.date = g.d::date)
$$;
