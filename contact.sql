-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – kontaktní formulář (uloží zprávu + pošle e-mail Honzovi)
--  Spusť v SQL Editoru. Předpoklad: notifications.sql (private.app_config + pg_net).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  topic      text,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;
grant insert on public.contact_messages to anon, authenticated;
grant select, delete on public.contact_messages to authenticated;

-- Odeslat zprávu smí kdokoliv
drop policy if exists "kontakt insert" on public.contact_messages;
create policy "kontakt insert" on public.contact_messages
  for insert to anon, authenticated with check (true);

-- Číst/mazat jen admin
drop policy if exists "kontakt admin" on public.contact_messages;
create policy "kontakt admin" on public.contact_messages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- E-mail Honzovi při nové zprávě
create or replace function public.notify_on_contact()
returns trigger language plpgsql security definer set search_path = public as $$
declare rkey text; admin_email text := 'schroffelh@seznam.cz';
begin
  select value into rkey from private.app_config where key = 'resend_api_key';
  if rkey is null then return new; end if;
  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || rkey, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', 'POHYB DOMA <noreply@pohybdoma.cz>',
      'to', admin_email,
      'reply_to', new.email,
      'subject', 'Nová zpráva z webu' || coalesce(' – ' || new.topic, ''),
      'html',
        '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B">' ||
        '<h2>Nová zpráva z kontaktu</h2>' ||
        '<p><strong>Jméno:</strong> ' || new.name || '</p>' ||
        '<p><strong>E-mail:</strong> ' || new.email || '</p>' ||
        coalesce('<p><strong>Téma:</strong> ' || new.topic || '</p>', '') ||
        '<p><strong>Zpráva:</strong><br>' || replace(new.message, chr(10), '<br>') || '</p></div>'
    )
  );
  return new;
end; $$;

drop trigger if exists on_contact_notify on public.contact_messages;
create trigger on_contact_notify after insert on public.contact_messages
  for each row execute function public.notify_on_contact();
