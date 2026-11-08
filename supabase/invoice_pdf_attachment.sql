-- ════════════════════════════════════════════════════════════════════════════
--  PDF PŘÍLOHA K E-MAILU S FAKTUROU
--   Rozšiřuje pd_send_email + admin_send_email o volitelnou přílohu.
--   Resend si PDF stáhne z veřejné (token chráněné) adresy přes 'path'.
--   Spustit v Supabase → SQL Editor na projektu webu (elavgxuequqnptbjswqn).
--   Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Sdílený odesílač e-mailů (nově s volitelnou přílohou) ───────────────────
drop function if exists public.pd_send_email(text, text, text);
create or replace function public.pd_send_email(
  p_to text, p_subject text, p_html text,
  p_attach_url text default null, p_attach_name text default null
)
returns boolean
language plpgsql security definer set search_path = public as $$
declare rkey text; body jsonb;
begin
  if p_to is null then return false; end if;
  select value into rkey from private.app_config where key = 'resend_api_key';
  if rkey is null then return false; end if;

  body := jsonb_build_object(
    'from', 'POHYB DOMA <noreply@pohybdoma.cz>',
    'to', p_to,
    'reply_to', 'pohybdoma@seznam.cz',
    'subject', p_subject,
    'html', p_html
  );

  -- Volitelná příloha (PDF faktury) – Resend ji stáhne z p_attach_url
  if p_attach_url is not null then
    body := body || jsonb_build_object(
      'attachments',
      jsonb_build_array(jsonb_build_object(
        'path', p_attach_url,
        'filename', coalesce(p_attach_name, 'faktura.pdf')
      ))
    );
  end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || rkey, 'Content-Type', 'application/json'),
    body := body
  );
  return true;
end; $$;

-- ── Admin obal (nově propouští přílohu) ─────────────────────────────────────
drop function if exists public.admin_send_email(text, text, text);
create or replace function public.admin_send_email(
  p_to text, p_subject text, p_html text,
  p_attach_url text default null, p_attach_name text default null
)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'jen admin'; end if;
  return public.pd_send_email(p_to, p_subject, p_html, p_attach_url, p_attach_name);
end; $$;
revoke all on function public.admin_send_email(text, text, text, text, text) from public;
grant execute on function public.admin_send_email(text, text, text, text, text) to authenticated;
