-- ════════════════════════════════════════════════════════════════════════════
--  Upomínka: konec členství 3 dny předem (e-mail přes Resend, budík pg_cron).
--  Respektuje preference uživatele (email_prefs.membership_end) i provozní
--  pravidlo „pošli jen jednou pro dané datum konce".
--
--  PŘEDPOKLADY:
--   • máš uložený resend_api_key v private.app_config (jako u rezervací),
--   • pro budík je potřeba rozšíření pg_cron — v Supabase: Database → Extensions
--     → zapni „pg_cron". (Funkce funguje i bez něj, jen by se nespouštěla sama.)
--  Spustit v Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pg_net;

-- ať neposíláme stejnou upomínku opakovaně každý den
alter table public.profiles add column if not exists membership_reminded_for timestamptz;

create or replace function public.send_membership_reminders()
returns void
language plpgsql security definer set search_path = public as $$
declare
  rkey text;
  rec  record;
  lbl  text;
  d    text;
  t    text;
begin
  select value into rkey from private.app_config where key = 'resend_api_key';
  if rkey is null then return; end if;

  for rec in
    select id, email, tier, tier_until
    from public.profiles
    where coalesce(tier, 'free') <> 'free'
      and tier_until is not null
      and tier_until > now()
      and tier_until <= now() + interval '3 days'
      and (membership_reminded_for is distinct from tier_until)
      and email is not null
      and coalesce((email_prefs ->> 'membership_end')::boolean, true) = true
  loop
    lbl := case rec.tier when 'member' then 'MEMBER' when 'vip' then 'VIP' when 'vip_plus' then 'VIP+' else upper(rec.tier) end;
    d := to_char(rec.tier_until at time zone 'Europe/Prague', 'DD.MM.YYYY');
    t := to_char(rec.tier_until at time zone 'Europe/Prague', 'HH24:MI');

    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || rkey, 'Content-Type', 'application/json'),
      body := jsonb_build_object(
        'from', 'POHYB DOMA <noreply@pohybdoma.cz>',
        'to', rec.email,
        'subject', 'Tvé členství brzy končí – POHYB DOMA',
        'html',
          '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B;max-width:520px">' ||
          '<h2 style="color:#062A6B;margin:0 0 8px">Tvé členství brzy končí</h2>' ||
          '<p style="color:#444;margin:0 0 14px">Tvé členství <strong>' || lbl || '</strong> končí <strong>' || d || '</strong> v <strong>' || t || '</strong>. Pak se přístup automaticky vrátí na úroveň FREE.</p>' ||
          '<p style="margin:0 0 22px"><a href="https://pohybdoma.cz/clenstvi" style="background:#1976FF;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:bold">Obnovit členství</a></p>' ||
          '<p style="color:#444;margin:0 0 2px">Ať se ti daří v pohybu.</p>' ||
          '<p style="color:#062A6B;font-weight:bold;margin:0">Honza — POHYB DOMA</p>' ||
          '<p style="color:#999;font-size:12px;margin-top:18px">Tuhle upomínku můžeš vypnout v účtu: Můj účet → Nastavení → E-mailová upozornění.</p></div>'
      )
    );

    update public.profiles set membership_reminded_for = rec.tier_until where id = rec.id;
  end loop;
end;
$$;

-- ── Budík: každý den v 6:00 (potřebuje zapnuté rozšíření pg_cron) ───────────
-- Spustí se znovu-bezpečně (starý job stejného jména nejdřív zruší).
do $$
begin
  perform cron.unschedule('membership-reminders-daily');
exception when others then null;
end $$;

select cron.schedule('membership-reminders-daily', '0 6 * * *', $$ select public.send_membership_reminders(); $$);
