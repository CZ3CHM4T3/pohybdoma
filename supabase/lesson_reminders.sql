-- ════════════════════════════════════════════════════════════════════════════
--  PŘIPOMÍNKA DEN PŘEDEM: klientovi přijde večer e-mail, že zítra má lekci a v kolik.
--  Zdroj: pravidelné lekce (mimo omluvené) + rezervace z webu na zítřek.
--  Předpoklad: pd_send_email (email_automation.sql), pg_cron pro budík.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.send_lesson_reminders()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  d date := current_date + 1;          -- zítřek
  wd int := extract(dow from (current_date + 1))::int;
  datum text := to_char((current_date + 1), 'DD.MM.YYYY');
  r record;
  sent int := 0;
begin
  -- Pravidelné lekce stálých klientů (s účtem), které zítra nejsou omluvené
  for r in
    select p.email as em, rl.time as t
      from public.recurring_lessons rl
      join public.profiles p on p.id = rl.client_id
     where rl.active and rl.client_id is not null and p.email is not null
       and rl.weekday = wd
       and not exists (select 1 from public.recurring_cancellations c where c.recurring_id = rl.id and c.date = d)
  loop
    perform public.pd_send_email(
      r.em,
      'Připomínka: zítra máš lekci v ' || r.t,
      '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B">' ||
      '<h2 style="color:#062A6B">Zítra se vidíme 🙂</h2>' ||
      '<p style="color:#444">Připomínám, že <strong>zítra ' || datum || '</strong> tě čeká lekce v <strong>' || r.t || '</strong>. Kdyby něco, dej vědět.</p>' ||
      '<p style="color:#062A6B;font-weight:bold;margin:14px 0 0">Honza — POHYB DOMA</p></div>'
    );
    sent := sent + 1;
  end loop;

  -- Rezervace z webu na zítřek (nezrušené)
  for r in
    select coalesce(p.email, b.contact_email) as em, b.time as t, b.service_name as sv
      from public.bookings b
      left join public.profiles p on p.id = b.user_id
     where b.date = d and b.status not in ('cancelled', 'no_show')
       and coalesce(p.email, b.contact_email) is not null
  loop
    perform public.pd_send_email(
      r.em,
      'Připomínka: zítra máš termín v ' || r.t,
      '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B">' ||
      '<h2 style="color:#062A6B">Zítra se vidíme 🙂</h2>' ||
      '<p style="color:#444">Připomínám termín <strong>' || coalesce(nullif(r.sv, ''), 'lekce') || '</strong> zítra <strong>' || datum || '</strong> v <strong>' || r.t || '</strong>.</p>' ||
      '<p style="color:#062A6B;font-weight:bold;margin:14px 0 0">Honza — POHYB DOMA</p></div>'
    );
    sent := sent + 1;
  end loop;

  return sent;
end;
$$;

-- Budík: každý den v 18:00 Praha (16:00 UTC). Potřebuje rozšíření pg_cron.
do $$ begin
  perform cron.unschedule('lesson-reminders-daily');
exception when others then null; end $$;
select cron.schedule('lesson-reminders-daily', '0 16 * * *', $$ select public.send_lesson_reminders(); $$);
