-- ============================================================
--  Smazání vlastního účtu (GDPR – právo být zapomenut)
--  Smaže NENÁVRATNĚ všechna osobní data uživatele:
--   • nahrané fotky v úložišti (avatar + obrázky v komunitě/chatu)
--   • rezervace (jméno, e-mail, telefon, adresa, důvod)
--   • recenze (jméno + text)
--   • a nakonec účet → kaskáda smaže profil, deník, kalendář,
--     odznaky, oblíbená videa, minuty, kruhy, příspěvky, komentáře,
--     zprávy, buddies, výzvy… (vše s ON DELETE CASCADE)
--  Po smazání si web nic nepamatuje. Nelze vrátit zpět.
--  Spustit v Supabase → SQL Editor.
-- ============================================================

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Nepřihlášený uživatel.';
  end if;

  -- 1) Nahrané soubory v úložišti (vedlejší úklid – nesmí shodit smazání účtu)
  begin
    delete from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = uid::text;
  exception when others then null; end;
  begin
    delete from storage.objects where bucket_id = 'community' and owner = uid;
  exception when others then null; end;

  -- 2) Rezervace (osobní údaje)
  begin
    delete from public.bookings where user_id = uid;
  exception when others then null; end;

  -- 3) Recenze (jméno + text)
  begin
    delete from public.reviews where user_id = uid;
  exception when others then null; end;

  -- 4) Účet → kaskáda smaže profil a všechna navázaná data (TOHLE je to hlavní)
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
