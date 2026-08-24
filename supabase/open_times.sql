-- ════════════════════════════════════════════════════════════════════════════
--  VOLNÉ (otevřené) hodiny pro veřejnou rezervaci.
--  Volno = hodiny uvolněné od stálých klientů (omluvy) + pevně otevřené hodiny
--  (availability_weekly.is_free, např. Čt 15:00) + jednorázová volna (overrides),
--  MÍNUS cokoliv, co je zrovna obsazené (busy_times).
--  Předpoklad: busy_times, recurring_lessons, recurring_cancellations,
--  availability_weekly, availability_overrides. Spustit v Supabase SQL Editoru.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.open_times(p_from date, p_to date)
returns table(date date, "time" text)
language sql
security definer
set search_path = public
stable
as $$
  with freed as (
    -- uvolněné výskyty stálých klientů (klient se omluvil)
    select c.date::date as date, r.time as time
      from public.recurring_cancellations c
      join public.recurring_lessons r on r.id = c.recurring_id
     where r.active and c.date between p_from and p_to
    union
    -- pevně otevřené hodiny (nastavené jako volné)
    select g.d::date, w.time
      from public.availability_weekly w
      cross join generate_series(p_from, p_to, interval '1 day') g(d)
     where w.is_free and extract(dow from g.d)::int = w.weekday
    union
    -- jednorázová volna pro konkrétní datum
    select o.date, o.time
      from public.availability_overrides o
     where o.status = 'free' and o.date between p_from and p_to
  )
  select f.date, f.time
    from freed f
   where not exists (
     select 1 from public.busy_times(p_from, p_to) b
      where b.date = f.date and b."time" = f.time
   )
$$;

grant execute on function public.open_times(date, date) to anon, authenticated;
