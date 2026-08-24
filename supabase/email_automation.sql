-- ════════════════════════════════════════════════════════════════════════════
--  GROUNDWORK: automatické e-maily (uvítací + potvrzení členství).
--  Připraveno tak, aby to po napojení platby (Comgate) jen zavolalo funkci.
--  Nic se nespustí samo – funkce se volají z aplikace / platebního webhooku
--  nebo ručně z SQL. Neposílá tedy zatím žádný spam.
--
--  PŘEDPOKLADY: resend_api_key v private.app_config (jako u rezervací/upomínek).
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pg_net;

-- Sdílený odesílač e-mailů přes Resend. Vrací true, pokud byl request odeslán.
create or replace function public.pd_send_email(p_to text, p_subject text, p_html text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare rkey text;
begin
  if p_to is null then return false; end if;
  select value into rkey from private.app_config where key = 'resend_api_key';
  if rkey is null then return false; end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || rkey, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', 'POHYB DOMA <noreply@pohybdoma.cz>',
      'to', p_to,
      'reply_to', 'pohybdoma@seznam.cz',
      'subject', p_subject,
      'html', p_html
    )
  );
  return true;
end;
$$;

-- Malý pomocník na jednotný vzhled e-mailu.
create or replace function public.pd_email_wrap(p_title text, p_body_html text, p_cta_label text, p_cta_url text)
returns text
language sql immutable as $$
  select
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B;max-width:520px">' ||
    '<h2 style="color:#062A6B;margin:0 0 8px">' || p_title || '</h2>' ||
    p_body_html ||
    case when p_cta_label is not null then
      '<p style="margin:18px 0 22px"><a href="' || p_cta_url || '" style="background:#1976FF;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:bold">' || p_cta_label || '</a></p>'
    else '' end ||
    '<p style="color:#062A6B;font-weight:bold;margin:0">Honza — POHYB DOMA</p></div>';
$$;

-- Uvítací e-mail po registraci. Volat: select public.send_welcome('<user_uuid>');
create or replace function public.send_welcome(p_user uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare em text; nm text;
begin
  select email, coalesce(full_name, '') into em, nm from public.profiles where id = p_user;
  if em is null then return false; end if;
  return public.pd_send_email(
    em,
    'Vítej v POHYB DOMA',
    public.pd_email_wrap(
      'Vítej' || case when nm <> '' then ', ' || nm else '' end || '!',
      '<p style="color:#444;margin:0 0 14px">Jsem rád, že tu jsi. Začni ukázkovými videi zdarma a rozhýbej tělo vlastním tempem.</p>',
      'Procházet videa', 'https://pohybdoma.cz/videoknihovna'
    )
  );
end;
$$;

-- Potvrzení aktivace členství (co si koupil). Volat po platbě / z adminu:
--   select public.send_membership_activated('<user_uuid>');
create or replace function public.send_membership_activated(p_user uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare em text; tr text; lbl text; d text;
begin
  select email,
         coalesce(tier, 'free'),
         to_char(tier_until at time zone 'Europe/Prague', 'DD.MM.YYYY')
    into em, tr, d
    from public.profiles where id = p_user;
  if em is null or tr = 'free' then return false; end if;
  lbl := case tr when 'member' then 'MEMBER' when 'vip' then 'VIP' when 'vip_plus' then 'VIP+' else upper(tr) end;
  return public.pd_send_email(
    em,
    'Členství ' || lbl || ' je aktivní – POHYB DOMA',
    public.pd_email_wrap(
      'Máš aktivní členství ' || lbl,
      '<p style="color:#444;margin:0 0 14px">Děkuju! Tvé členství <strong>' || lbl || '</strong> je aktivní' ||
        case when d is not null then ' do <strong>' || d || '</strong>' else '' end ||
        '. Vše, co ti odemklo, najdeš ve svém účtu.</p>',
      'Otevřít můj účet', 'https://pohybdoma.cz/ucet'
    )
  );
end;
$$;
