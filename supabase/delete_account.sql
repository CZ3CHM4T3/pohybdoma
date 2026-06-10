-- ============================================================
--  Smazání vlastního účtu (GDPR – právo být zapomenut)
--  Smaže uživatele z auth.users; navázaná data zmizí přes
--  ON DELETE CASCADE (profiles, video_watch, kalendář, zprávy…).
--  Spustit v Supabase → SQL Editor.
-- ============================================================

create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = public, auth
as $$
  delete from auth.users where id = auth.uid();
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
