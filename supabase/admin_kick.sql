-- ============================================================
--  Admin: vyhození člena z webu (kick) – při hrubém porušení pravidel.
--  Smaže účet i navázaná data (stejně jako smazání vlastního účtu).
--  Pojistky: jen admin, nelze vyhodit sebe ani jiného admina.
--  Spustit v Supabase → SQL Editor.
-- ============================================================

create or replace function public.admin_kick_member(target_id uuid)
returns void
language plpgsql security definer set search_path = public, auth, storage as $$
declare
  target_is_admin boolean;
begin
  if not public.is_admin() then
    raise exception 'Nedostatecna opravneni';
  end if;
  if target_id = auth.uid() then
    raise exception 'Sebe vyhodit nelze';
  end if;
  select (lower(email) = 'schroffelh@seznam.cz') into target_is_admin
  from auth.users where id = target_id;
  if coalesce(target_is_admin, false) then
    raise exception 'Admina vyhodit nelze';
  end if;

  begin delete from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = target_id::text; exception when others then null; end;
  begin delete from storage.objects where bucket_id = 'community' and owner = target_id; exception when others then null; end;
  begin delete from public.bookings where user_id = target_id; exception when others then null; end;
  begin delete from public.reviews  where user_id = target_id; exception when others then null; end;
  delete from auth.users where id = target_id;
end;
$$;
revoke all on function public.admin_kick_member(uuid) from public, anon;
grant execute on function public.admin_kick_member(uuid) to authenticated;
