-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – REZERVACE: potvrzovací e-maily + zrušení klientem
--  Spusť v Supabase SQL Editoru. Předpoklad: notifications.sql (private.app_config),
--  pg_net. Lze spustit opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Potvrzovací e-maily po vytvoření rezervace (klientovi + adminovi) ─────
create or replace function public.notify_on_booking()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  rkey text;
  admin_email text := 'schroffelh@seznam.cz';
  datum text;
  kde text;
begin
  select value into rkey from private.app_config where key = 'resend_api_key';
  if rkey is null then return new; end if;

  datum := to_char(new.date, 'DD.MM.YYYY');
  kde := case when new.mode = 'online' then 'Online'
              else coalesce('Osobně – ' || new.address || ', ' || new.municipality, 'Osobně') end;

  -- Klientovi: potvrzení přijetí
  if new.contact_email is not null then
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || rkey, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', 'POHYB DOMA <noreply@pohybdoma.cz>',
        'to', new.contact_email,
        'subject', 'Přijal jsem tvoji rezervaci – POHYB DOMA',
        'html',
          '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B">' ||
          '<h2 style="color:#062A6B">Díky za rezervaci!</h2>' ||
          '<p style="color:#444">Mám tvoji rezervaci a brzy se ti ozvu s potvrzením a platebními údaji.</p>' ||
          '<table style="font-size:14px;color:#333"><tr><td><strong>Služba:</strong></td><td>' || new.service_name || '</td></tr>' ||
          '<tr><td><strong>Termín:</strong></td><td>' || datum || ' v ' || new.time || '</td></tr>' ||
          '<tr><td><strong>Forma:</strong></td><td>' || kde || '</td></tr>' ||
          '<tr><td><strong>Cena:</strong></td><td>' || new.price_kc || ' Kč</td></tr></table>' ||
          '<p style="color:#888;font-size:12px;margin-top:20px">Zrušení nebo přesun je možný nejpozději 24 h předem ve tvém účtu. POHYB DOMA</p></div>'
      )
    );
  end if;

  -- Adminovi: upozornění na novou rezervaci
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || rkey, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', 'POHYB DOMA <noreply@pohybdoma.cz>',
      'to', admin_email,
      'subject', 'Nová rezervace: ' || new.service_name || ' (' || datum || ')',
      'html',
        '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B">' ||
        '<h2>Nová rezervace</h2>' ||
        '<table style="font-size:14px;color:#333">' ||
        '<tr><td><strong>Služba:</strong></td><td>' || new.service_name || '</td></tr>' ||
        '<tr><td><strong>Termín:</strong></td><td>' || datum || ' v ' || new.time || '</td></tr>' ||
        '<tr><td><strong>Forma:</strong></td><td>' || kde || '</td></tr>' ||
        '<tr><td><strong>Jméno:</strong></td><td>' || new.contact_name || '</td></tr>' ||
        '<tr><td><strong>E-mail:</strong></td><td>' || coalesce(new.contact_email, '—') || '</td></tr>' ||
        '<tr><td><strong>Telefon:</strong></td><td>' || coalesce(new.contact_phone, '—') || '</td></tr>' ||
        '<tr><td><strong>Cena:</strong></td><td>' || new.price_kc || ' Kč</td></tr>' ||
        '<tr><td valign="top"><strong>Důvod:</strong></td><td>' || coalesce(new.reason, '—') || '</td></tr>' ||
        '</table></div>'
    )
  );

  return new;
end;
$$;

drop trigger if exists on_booking_notify on public.bookings;
create trigger on_booking_notify
  after insert on public.bookings
  for each row execute function public.notify_on_booking();

-- ── 2) Klient smí měnit (zrušit) svoji rezervaci ────────────────────────────
grant update on public.bookings to authenticated;
drop policy if exists "klient upravuje svoji rezervaci" on public.bookings;
create policy "klient upravuje svoji rezervaci" on public.bookings
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
