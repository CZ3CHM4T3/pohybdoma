-- ════════════════════════════════════════════════════════════════════════════
--  STAVY DORUČENÍ FAKTUR (Resend webhooky)
--   • invoices.delivery_status: null → 'delivered' | 'bounced' | 'complained'
--   • delivered_at / bounced_at / opened_at
--   • pd_send_email + admin_send_email nově přidají značku (tag) invoice=<číslo>,
--     aby webhook poznal, které faktury se událost týká.
--   Spustit v Supabase → SQL Editor na projektu webu (elavgxuequqnptbjswqn).
--   Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.invoices add column if not exists delivery_status text;  -- null | delivered | bounced | complained
alter table public.invoices add column if not exists delivered_at timestamptz;
alter table public.invoices add column if not exists bounced_at   timestamptz;
alter table public.invoices add column if not exists opened_at     timestamptz;

-- ── Odesílač e-mailů: + volitelná příloha (dříve) + volitelná značka invoice ──
drop function if exists public.pd_send_email(text, text, text, text, text);
drop function if exists public.pd_send_email(text, text, text);
create or replace function public.pd_send_email(
  p_to text, p_subject text, p_html text,
  p_attach_url text default null, p_attach_name text default null,
  p_tag_value text default null
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

  if p_attach_url is not null then
    body := body || jsonb_build_object('attachments',
      jsonb_build_array(jsonb_build_object('path', p_attach_url, 'filename', coalesce(p_attach_name, 'faktura.pdf'))));
  end if;

  -- Značka pro spárování s fakturou ve webhooku (jen číslice/písmena/_/-)
  if p_tag_value is not null then
    body := body || jsonb_build_object('tags',
      jsonb_build_array(jsonb_build_object('name', 'invoice', 'value', p_tag_value)));
  end if;

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || rkey, 'Content-Type', 'application/json'),
    body := body
  );
  return true;
end; $$;

-- ── Admin obal (nově propouští i značku) ────────────────────────────────────
drop function if exists public.admin_send_email(text, text, text, text, text);
drop function if exists public.admin_send_email(text, text, text);
create or replace function public.admin_send_email(
  p_to text, p_subject text, p_html text,
  p_attach_url text default null, p_attach_name text default null,
  p_tag_value text default null
)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'jen admin'; end if;
  return public.pd_send_email(p_to, p_subject, p_html, p_attach_url, p_attach_name, p_tag_value);
end; $$;
revoke all on function public.admin_send_email(text, text, text, text, text, text) from public;
grant execute on function public.admin_send_email(text, text, text, text, text, text) to authenticated;
