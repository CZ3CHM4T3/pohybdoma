-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – obsazené termíny (pro zobrazení volno/obsazeno klientům)
--  Vrací JEN datum + čas obsazených hodin (žádná jména ani osobní data), takže
--  to smí číst kdokoliv. Zdroj: aktivní rezervace (kromě zrušených) + vlastní lekce.
--  Spusť v Supabase → SQL Editor → Run. Lze opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.busy_times(p_from date, p_to date)
returns table(date date, "time" text)
language sql
security definer
set search_path = public
stable
as $$
  select b.date, b.time
    from public.bookings b
   where b.status <> 'cancelled'
     and b.date between p_from and p_to
  union
  select l.date, l.time
    from public.lesson_plans l
   where l.date between p_from and p_to
$$;

grant execute on function public.busy_times(date, date) to anon, authenticated;
