-- ════════════════════════════════════════════════════════════════════════════
--  DOPLNĚK NOTIFIKACÍ: omluvy a zrušení
--   1) Klient se omluví z pravidelné lekce → e-mail Honzovi (+ potvrzení klientovi)
--   2) Klient zruší / nedorazí na rezervaci → e-mail Honzovi
--  Předpoklad: private.app_config('resend_api_key'), pg_net, ověřená doména v Resend.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pg_net;

-- ── 1) Omluva z pravidelné lekce ────────────────────────────────────────────
create or replace function public.notify_on_recurring_cancel()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  rkey text;
  admin_email text := 'schroffelh@seznam.cz';
  cli text; wd smallint; tm text; cid uuid; datum text; den text; cli_email text;
  by_client boolean;
  wd_names text[] := array['neděli','pondělí','úterý','středu','čtvrtek','pátek','sobotu'];
begin
  select value into rkey from private.app_config where key = 'resend_api_key';
  if rkey is null then return new; end if;

  select client_name, weekday, time, client_id into cli, wd, tm, cid
    from public.recurring_lessons where id = new.recurring_id;
  datum := to_char(new.date, 'DD.MM.YYYY');
  den := wd_names[wd + 1];
  by_client := (new.cancelled_by is not null and new.cancelled_by = cid);
  if cid is not null then select email into cli_email from public.profiles where id = cid; end if;

  if by_client then
    -- KLIENT se omluvil → mail Honzovi + potvrzení klientovi
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || rkey, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', 'POHYB DOMA <noreply@pohybdoma.cz>',
        'to', admin_email,
        'subject', 'Omluva z lekce: ' || coalesce(cli, 'klient') || ' – ' || datum,
        'html',
          '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B">' ||
          '<h2 style="color:#062A6B">Omluva z pravidelné lekce</h2>' ||
          '<p style="color:#444"><strong>' || coalesce(cli, 'Klient') || '</strong> se omluvil z termínu:</p>' ||
          '<table style="font-size:14px;color:#333">' ||
          '<tr><td><strong>Datum:</strong></td><td>' || datum || ' (' || den || ')</td></tr>' ||
          '<tr><td><strong>Čas:</strong></td><td>' || coalesce(tm, '—') || '</td></tr></table>' ||
          '<p style="color:#888;font-size:12px;margin-top:16px">Termín se uvolnil a může si ho vzít někdo jiný. POHYB DOMA</p></div>'
      )
    );
    perform public.pd_notify(public.admin_uid(), 'Omluva z lekce', coalesce(cli, 'Klient') || ' – ' || datum || ' ' || coalesce(tm, ''));
    if cli_email is not null then
      perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object('Authorization', 'Bearer ' || rkey, 'Content-Type', 'application/json'),
        body := jsonb_build_object(
          'from', 'POHYB DOMA <noreply@pohybdoma.cz>', 'to', cli_email, 'reply_to', 'pohybdoma@seznam.cz',
          'subject', 'Omluva přijata – ' || datum,
          'html',
            '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B">' ||
            '<h2 style="color:#062A6B">Omluva je zaznamenaná</h2>' ||
            '<p style="color:#444">Beru na vědomí, že na lekci <strong>' || datum || ' v ' || coalesce(tm, '') || '</strong> nedorazíš. Ostatní termíny běží dál beze změny.</p>' ||
            '<p style="color:#062A6B;font-weight:bold;margin:14px 0 0">Honza — POHYB DOMA</p></div>'
        )
      );
    end if;
  else
    -- LEKTOR zrušil termín → mail KLIENTOVI
    if cli_email is not null then
      perform net.http_post(
        url := 'https://api.resend.com/emails',
        headers := jsonb_build_object('Authorization', 'Bearer ' || rkey, 'Content-Type', 'application/json'),
        body := jsonb_build_object(
          'from', 'POHYB DOMA <noreply@pohybdoma.cz>', 'to', cli_email, 'reply_to', 'pohybdoma@seznam.cz',
          'subject', 'Zrušená lekce – ' || datum,
          'html',
            '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B">' ||
            '<h2 style="color:#062A6B">Musel jsem zrušit tvoji lekci</h2>' ||
            '<p style="color:#444">Omlouvám se, ale lekci <strong>' || datum || ' v ' || coalesce(tm, '') || '</strong> musím zrušit. Ozvu se ti ohledně náhradního termínu (nebo mrkni do účtu na nabídku). Díky za pochopení.</p>' ||
            '<p style="color:#062A6B;font-weight:bold;margin:14px 0 0">Honza — POHYB DOMA</p></div>'
        )
      );
    end if;
    perform public.pd_notify(cid, 'Zrušená lekce', 'Lektor zrušil termín ' || datum || ' ' || coalesce(tm, ''));
  end if;

  return new;
exception when others then
  -- Notifikace nesmí NIKDY shodit zrušení/omluvu – chybu spolkneme.
  return new;
end;
$$;

drop trigger if exists on_recurring_cancel_notify on public.recurring_cancellations;
create trigger on_recurring_cancel_notify
  after insert on public.recurring_cancellations
  for each row execute function public.notify_on_recurring_cancel();

-- ── 2) Zrušení / nedostavení se u jednorázové rezervace ─────────────────────
create or replace function public.notify_on_booking_cancel()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  rkey text;
  admin_email text := 'schroffelh@seznam.cz';
  datum text; stav text;
begin
  -- jen když se stav opravdu změnil na zrušeno / nedostavil se
  if new.status is not distinct from old.status then return new; end if;
  if new.status not in ('cancelled', 'no_show') then return new; end if;

  select value into rkey from private.app_config where key = 'resend_api_key';
  if rkey is null then return new; end if;

  datum := to_char(new.date, 'DD.MM.YYYY');
  stav := case new.status when 'cancelled' then 'Zrušeno včas' else 'Nedostavil(a) se' end;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || rkey, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', 'POHYB DOMA <noreply@pohybdoma.cz>',
      'to', admin_email,
      'subject', stav || ': ' || new.service_name || ' (' || datum || ')',
      'html',
        '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B">' ||
        '<h2 style="color:#062A6B">' || stav || '</h2>' ||
        '<table style="font-size:14px;color:#333">' ||
        '<tr><td><strong>Služba:</strong></td><td>' || new.service_name || '</td></tr>' ||
        '<tr><td><strong>Termín:</strong></td><td>' || datum || ' v ' || new.time || '</td></tr>' ||
        '<tr><td><strong>Jméno:</strong></td><td>' || coalesce(new.contact_name, '—') || '</td></tr>' ||
        '<tr><td><strong>E-mail:</strong></td><td>' || coalesce(new.contact_email, '—') || '</td></tr></table>' ||
        '<p style="color:#888;font-size:12px;margin-top:16px">POHYB DOMA</p></div>'
    )
  );

  perform public.pd_notify(public.admin_uid(), stav, new.service_name || ' · ' || datum || ' v ' || new.time);

  return new;
exception when others then
  -- Notifikace nesmí shodit zrušení rezervace – chybu spolkneme.
  return new;
end;
$$;

drop trigger if exists on_booking_cancel_notify on public.bookings;
create trigger on_booking_cancel_notify
  after update of status on public.bookings
  for each row execute function public.notify_on_booking_cancel();
