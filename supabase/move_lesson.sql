-- ════════════════════════════════════════════════════════════════════════════
--  PŘESUN LEKCE klientem (i lektorem přes stejnou funkci).
--  Klient si u své pravidelné lekce zvolí PŘESUNOUT → zadá den a čas (volný) →
--  původní termín se uvolní a vznikne nový. Lektorovi přijde mail + bublina.
--  Předpoklad: recurring_notify.sql (sloupec moved), busy_times, pd_send_email, pd_notify.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.move_lesson(p_recurring uuid, p_orig_date date, p_new_date text, p_new_time text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  u uuid := auth.uid();
  cid uuid; cname text; otime text; price integer;
  nd date := p_new_date::date;
begin
  if u is null then raise exception 'nepřihlášen'; end if;
  select client_id, client_name, time, price_kc into cid, cname, otime, price
    from public.recurring_lessons where id = p_recurring;
  if cid is null or cid <> u then raise exception 'není tvoje lekce'; end if;

  -- Nejde měnit méně než 24 h předem
  if (p_orig_date + otime::time) < (now() at time zone 'Europe/Prague') + interval '24 hours' then
    raise exception 'Přesun je možný nejpozději 24 h předem.';
  end if;
  -- Už zrušený/přesunutý termín znovu neřešíme
  if exists (select 1 from public.recurring_cancellations c where c.recurring_id = p_recurring and c.date = p_orig_date) then
    raise exception 'Tento termín už je zrušený.';
  end if;
  -- Cílová hodina musí být volná (kontrola na úrovni hodiny)
  if exists (select 1 from public.busy_times(nd, nd) b where left(b.time, 2) = left(p_new_time, 2)) then
    raise exception 'Ten čas je obsazený, vyber jiný.';
  end if;

  -- Uvolni původní (moved=true → nepošle omluvu) a vytvoř nový termín
  insert into public.recurring_cancellations (recurring_id, date, cancelled_by, moved)
    values (p_recurring, p_orig_date, u, true);
  insert into public.lesson_plans (date, time, client_name, note, price_kc)
    values (nd, p_new_time, cname, 'Přesun', coalesce(price, 0));

  -- Oznámení lektorovi
  perform public.pd_notify(public.admin_uid(), 'Přesun lekce',
    cname || ': ' || to_char(p_orig_date, 'DD.MM.') || ' → ' || to_char(nd, 'DD.MM.YYYY') || ' v ' || p_new_time);
  perform public.pd_send_email(
    'schroffelh@seznam.cz',
    'Přesun lekce: ' || cname,
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B">' ||
    '<h2 style="color:#062A6B">Klient přesunul lekci</h2>' ||
    '<p style="color:#444"><strong>' || cname || '</strong> přesunul lekci z <strong>' ||
      to_char(p_orig_date, 'DD.MM.YYYY') || ' v ' || coalesce(otime, '') || '</strong> na <strong>' ||
      to_char(nd, 'DD.MM.YYYY') || ' v ' || p_new_time || '</strong>. Přidal jsem to do rozvrhu.</p></div>'
  );
  -- Potvrzení klientovi (bublina)
  perform public.pd_notify(u, 'Lekce přesunuta', 'Nový termín ' || to_char(nd, 'DD.MM.YYYY') || ' v ' || p_new_time);

  return true;
end;
$$;

grant execute on function public.move_lesson(uuid, date, text, text) to authenticated;

-- ── Přesun LEKTOREM (z kalendáře) → uvědomí klienta ──────────────────────────
create or replace function public.admin_move_lesson(p_recurring uuid, p_orig_date date, p_new_date text, p_new_time text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare cid uuid; cname text; otime text; price integer; cli_email text; nd date := p_new_date::date;
begin
  if not public.is_admin() then raise exception 'jen admin'; end if;
  select client_id, client_name, time, price_kc into cid, cname, otime, price
    from public.recurring_lessons where id = p_recurring;
  if exists (select 1 from public.recurring_cancellations c where c.recurring_id = p_recurring and c.date = p_orig_date) then
    raise exception 'Tento termín už je zrušený.';
  end if;
  if exists (select 1 from public.busy_times(nd, nd) b where left(b.time, 2) = left(p_new_time, 2)) then
    raise exception 'Ten čas je obsazený, vyber jiný.';
  end if;

  insert into public.recurring_cancellations (recurring_id, date, cancelled_by, moved)
    values (p_recurring, p_orig_date, public.admin_uid(), true);
  insert into public.lesson_plans (date, time, client_name, note, price_kc)
    values (nd, p_new_time, cname, 'Přesun', coalesce(price, 0));

  if cid is not null then
    select email into cli_email from public.profiles where id = cid;
    perform public.pd_notify(cid, 'Lekce přesunuta', 'Lektor přesunul tvoji lekci na ' || to_char(nd, 'DD.MM.YYYY') || ' v ' || p_new_time);
    if cli_email is not null then
      perform public.pd_send_email(
        cli_email,
        'Přesun lekce – ' || to_char(nd, 'DD.MM.YYYY'),
        '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B">' ||
        '<h2 style="color:#062A6B">Přesunul jsem tvoji lekci</h2>' ||
        '<p style="color:#444">Lekci <strong>' || to_char(p_orig_date, 'DD.MM.YYYY') || ' v ' || coalesce(otime, '') ||
          '</strong> jsem přesunul na <strong>' || to_char(nd, 'DD.MM.YYYY') || ' v ' || p_new_time || '</strong>. Kdyby nesedělo, ozvi se.</p>' ||
        '<p style="color:#062A6B;font-weight:bold;margin:14px 0 0">Honza — POHYB DOMA</p></div>'
      );
    end if;
  end if;
  return true;
end;
$$;

grant execute on function public.admin_move_lesson(uuid, date, text, text) to authenticated;
