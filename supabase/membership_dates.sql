-- ============================================================
--  Členství: datum získání / konce + bonusové dny (admin)
--  Spustit v Supabase → SQL Editor (po membership.sql).
-- ============================================================

alter table public.profiles add column if not exists tier_since timestamptz;
alter table public.profiles add column if not exists tier_until timestamptz;
alter table public.profiles add column if not exists bonus_days int not null default 0;

-- Nastavení úrovně (admin): u placené úrovně orazítkuje 30denní období + bonus dny.
create or replace function public.set_user_tier(target_id uuid, new_tier text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Nedostatecna opravneni';
  end if;
  if new_tier not in ('free', 'member', 'vip', 'vip_plus') then
    raise exception 'Neplatna uroven: %', new_tier;
  end if;
  if new_tier = 'free' then
    update public.profiles set tier = new_tier, tier_since = null, tier_until = null where id = target_id;
  else
    update public.profiles
      set tier = new_tier,
          tier_since = now(),
          tier_until = now() + make_interval(days => 30 + coalesce(bonus_days, 0))
      where id = target_id;
  end if;
end;
$$;
grant execute on function public.set_user_tier(uuid, text) to authenticated;

-- Přidání (nebo odebrání) bonusových dní – prodlouží i konec členství.
create or replace function public.grant_bonus_days(target_id uuid, days int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Nedostatecna opravneni';
  end if;
  update public.profiles
    set bonus_days = greatest(0, coalesce(bonus_days, 0) + days),
        tier_until = case
          when tier_until is not null then tier_until + make_interval(days => days)
          when tier is not null and tier <> 'free' then now() + make_interval(days => days)
          else tier_until
        end
    where id = target_id;
end;
$$;
grant execute on function public.grant_bonus_days(uuid, int) to authenticated;

-- Přidání libovolného počtu dní libovolné úrovně členství (admin).
create or replace function public.add_membership_days(target_id uuid, p_tier text, p_days int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Nedostatecna opravneni'; end if;
  if p_tier not in ('member','vip','vip_plus') then raise exception 'Neplatna uroven'; end if;
  if coalesce(p_days, 0) = 0 then return; end if;
  update public.profiles
     set tier = p_tier,
         tier_since = case when coalesce(tier, 'free') <> p_tier then now() else coalesce(tier_since, now()) end,
         tier_until = greatest(coalesce(tier_until, now()), now()) + make_interval(days => p_days)
   where id = target_id;
end;
$$;
grant execute on function public.add_membership_days(uuid, text, int) to authenticated;
