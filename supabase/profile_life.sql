-- "Více života" do profilu člena: motto, cíl, oblíbená aktivita.
-- Spustit v Supabase SQL editoru.

-- 1) Sloupce na profiles
alter table public.profiles add column if not exists motto text;
alter table public.profiles add column if not exists goal  text;
alter table public.profiles add column if not exists fave  text;

-- 2) Uložení vlastních údajů (SECURITY DEFINER – uživatel nemá přímý UPDATE grant na tyto sloupce)
create or replace function public.set_profile_extra(p_motto text, p_goal text, p_fave text)
returns void
language sql security definer set search_path = public as $$
  update public.profiles set
    motto = nullif(btrim(left(coalesce(p_motto, ''), 140)), ''),
    goal  = nullif(btrim(left(coalesce(p_goal,  ''), 140)), ''),
    fave  = nullif(btrim(left(coalesce(p_fave,  ''), 80)),  '')
  where id = auth.uid();
$$;
grant execute on function public.set_profile_extra(text, text, text) to authenticated;

-- 3) Veřejný profil vrací i nová pole
drop function if exists public.public_profile(uuid);
create or replace function public.public_profile(p_id uuid)
returns table (id uuid, name text, tier text, pinned_badges text[], motto text, goal text, fave text)
language sql stable security definer set search_path = public, auth as $$
  select u.id,
    coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1), 'Člen'),
    coalesce(p.tier, 'free'),
    coalesce(p.pinned_badges, '{}'),
    p.motto, p.goal, p.fave
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_id;
$$;
grant execute on function public.public_profile(uuid) to authenticated;
