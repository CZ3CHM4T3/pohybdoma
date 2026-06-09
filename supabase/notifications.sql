-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – E-MAIL NOTIFIKACE PŘÍMO Z DATABÁZE (bez Vercelu)
--  Maily se posílají přes Resend automaticky při vložení komentáře/odpovědi.
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
--
--  ⚠️ NEJDŘÍV ulož svůj Resend klíč (samostatně, NEcommituje se):
--     insert into private.app_config (key, value)
--       values ('resend_api_key', 're_TVUJ_KLIC')
--       on conflict (key) do update set value = excluded.value;
-- ════════════════════════════════════════════════════════════════════════════

-- HTTP z databáze
create extension if not exists pg_net;

-- Privátní tabulka pro tajné hodnoty (schéma private není přístupné přes API)
create schema if not exists private;
create table if not exists private.app_config (
  key   text primary key,
  value text not null
);

-- ── Trigger: po vložení komentáře pošli mail příjemcům ──────────────────────
create or replace function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rkey          text;
  post_author   uuid;
  parent_author uuid;
  who           text;
  is_lektor     boolean;
  subj          text;
  rec           record;
begin
  select value into rkey from private.app_config where key = 'resend_api_key';
  if rkey is null then
    return new; -- klíč není nastavený → nic neposílej
  end if;

  select author_id into post_author from public.community_posts where id = new.post_id;
  if post_author is null then
    return new;
  end if;

  if new.parent_id is not null then
    select author_id into parent_author from public.community_comments where id = new.parent_id;
  end if;

  is_lektor := (new.author_role = 'lektor');
  who := coalesce(new.author_name, 'Někdo');
  subj := case when is_lektor
    then 'Lektor ti odpověděl v klubu – POHYB DOMA'
    else who || ' reagoval(a) v klubu – POHYB DOMA' end;

  for rec in
    select distinct pr.email
    from public.profiles pr
    where pr.id in (post_author, parent_author)
      and pr.id <> new.author_id        -- sám sobě neposílej
      and pr.email is not null
  loop
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || rkey,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'from', 'POHYB DOMA <noreply@pohybdoma.cz>',
        'to', rec.email,
        'subject', subj,
        'html',
          '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B;max-width:520px">' ||
          '<h2 style="color:#062A6B;margin:0 0 8px">Ahoj!</h2>' ||
          '<p style="color:#444;margin:0 0 14px">' ||
            (case when is_lektor then 'Lektor ti právě odpověděl ve VIP+ Klubu.'
                  else who || ' reagoval(a) na tvůj příspěvek ve VIP+ Klubu.' end) ||
          '</p>' ||
          '<p style="margin:0 0 22px"><a href="https://pohybdoma.cz/klub" style="background:#1976FF;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:bold">Otevřít diskuzi</a></p>' ||
          '<p style="color:#444;margin:0 0 2px">Díky, že jsi součástí komunity. 🙌</p>' ||
          '<p style="color:#062A6B;font-weight:bold;margin:0">Honza · POHYB DOMA</p>' ||
          '<p style="color:#999;font-size:12px;margin-top:18px">Tento e-mail ti přišel, protože ti někdo odpověděl v klubu.</p></div>'
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists on_comment_notify on public.community_comments;
create trigger on_comment_notify
  after insert on public.community_comments
  for each row execute function public.notify_on_comment();
