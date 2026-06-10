-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – ČLENSTVÍ / ŘÍZENÍ PŘÍSTUPU
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
--  Předpoklad: už proběhly schema.sql a admin-policies.sql (funkce is_admin()).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Profil dostane e-mail (pro zobrazení v adminu) ───────────────────────
alter table public.profiles add column if not exists email text;

-- ── 2) Automatické vytvoření profilu při registraci ─────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, tier)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', 'free')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 3) Doplnění profilů pro už existující uživatele ─────────────────────────
insert into public.profiles (id, email, full_name, tier)
select u.id, u.email, u.raw_user_meta_data ->> 'full_name', 'free'
from auth.users u
on conflict (id) do update set email = excluded.email;

-- ── 4) Práva ────────────────────────────────────────────────────────────────
grant select on public.profiles to authenticated;
-- Běžný uživatel smí měnit jen své JMÉNO, nikdy ne úroveň (tier) ani is_admin.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- ── 5) Admin vidí všechny profily (členy) ───────────────────────────────────
drop policy if exists "admin cte profily" on public.profiles;
create policy "admin cte profily" on public.profiles
  for select to authenticated
  using (public.is_admin());

-- ── 6) Bezpečné nastavení úrovně členství (jen admin) ───────────────────────
-- SECURITY DEFINER => obchází RLS i sloupcová práva, ale uvnitř hlídá is_admin().
create or replace function public.set_user_tier(target_id uuid, new_tier text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nedostatecna opravneni';
  end if;
  if new_tier not in ('free', 'member', 'vip', 'vip_plus') then
    raise exception 'Neplatna uroven: %', new_tier;
  end if;
  update public.profiles set tier = new_tier where id = target_id;
end;
$$;

grant execute on function public.set_user_tier(uuid, text) to authenticated;
