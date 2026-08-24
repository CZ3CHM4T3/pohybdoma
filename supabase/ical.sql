-- ════════════════════════════════════════════════════════════════════════════
--  iCal odběr pro klienty – každý má osobní odkaz jen se svými lekcemi.
--  Přidají si ho dobrovolně do Google/Apple kalendáře. Nikdo nevidí lekce jiných.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists ical_token text;

-- Vrátí (a případně vytvoří) osobní token přihlášeného klienta
create or replace function public.my_ical_token()
returns text
language plpgsql security definer set search_path = public as $$
declare tok text;
begin
  if auth.uid() is null then return null; end if;
  select ical_token into tok from public.profiles where id = auth.uid();
  if tok is null then
    tok := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    update public.profiles set ical_token = tok where id = auth.uid();
  end if;
  return tok;
end;
$$;

-- Události pro daný token (volá veřejná iCal route). Definer → obejde RLS, ale vrací
-- jen lekce vlastníka tokenu.
create or replace function public.ical_events(p_token text)
returns table(uid text, dtstart text, dtend text, summary text)
language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  select id into u from public.profiles where ical_token = p_token;
  if u is null then return; end if;

  -- Pravidelné lekce (příštích ~180 dní, mimo omluvené)
  return query
    select 'rec-' || r.id || '-' || to_char(g.d::date, 'YYYYMMDD'),
           to_char(((g.d::date + r.time::time) at time zone 'Europe/Prague') at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"'),
           to_char((((g.d::date + r.time::time) + interval '1 hour') at time zone 'Europe/Prague') at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"'),
           'Lekce – POHYB DOMA'
      from public.recurring_lessons r
      cross join generate_series(current_date, current_date + 180, interval '1 day') g(d)
     where r.client_id = u and r.active
       and extract(dow from g.d::date)::int = r.weekday
       and not exists (select 1 from public.recurring_cancellations c where c.recurring_id = r.id and c.date = g.d::date);

  -- Rezervace z webu (budoucí, nezrušené)
  return query
    select 'bk-' || b.id,
           to_char(((b.date + b.time::time) at time zone 'Europe/Prague') at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"'),
           to_char((((b.date + b.time::time) + interval '1 hour') at time zone 'Europe/Prague') at time zone 'UTC', 'YYYYMMDD"T"HH24MISS"Z"'),
           coalesce(nullif(b.service_name, ''), 'Lekce – POHYB DOMA')
      from public.bookings b
     where b.user_id = u and b.status not in ('cancelled', 'no_show') and b.date >= current_date;
end;
$$;

grant execute on function public.my_ical_token() to authenticated;
grant execute on function public.ical_events(text) to anon, authenticated;
