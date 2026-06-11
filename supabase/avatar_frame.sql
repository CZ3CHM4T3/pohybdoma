-- ============================================================
--  Prémiový rámeček fotky podle umístění v žebříčku
--  (rank 1 → zlato, 2 → stříbro, 3 → bronz)
--  Spustit v Supabase → SQL Editor (po video_minutes / SPUSTIT_V_SUPABASE).
-- ============================================================

alter table public.profiles add column if not exists avatar_frame text;

-- Nastaví rámeček – server ověří, že si ho uživatel zasloužil (nejlepší umístění).
create or replace function public.set_avatar_frame(p_frame text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  best int;
  allowed boolean;
begin
  if auth.uid() is null then return null; end if;

  -- vyber rámečku zrušit
  if p_frame is null or btrim(p_frame) = '' then
    update public.profiles set avatar_frame = null where id = auth.uid();
    return null;
  end if;

  -- nejlepší historické umístění uživatele (napříč měsíci)
  select min(rnk) into best from (
    select row_number() over (partition by m order by secs desc)::int as rnk, uid
    from (
      select date_trunc('month', watched_at) as m, user_id as uid, sum(seconds) as secs
      from public.video_watch
      group by 1, 2
    ) t
  ) r where r.uid = auth.uid();

  allowed :=
    (p_frame = 'gold'   and best is not null and best <= 1) or
    (p_frame = 'silver' and best is not null and best <= 2) or
    (p_frame = 'bronze' and best is not null and best <= 3);

  if not allowed then
    return null; -- nezasloužený rámeček neuložíme
  end if;

  update public.profiles set avatar_frame = p_frame where id = auth.uid();
  return p_frame;
end;
$$;
grant execute on function public.set_avatar_frame(text) to authenticated;

-- public_profile nově vrací i avatar_frame (ať rámeček vidí i ostatní)
drop function if exists public.public_profile(uuid);
create or replace function public.public_profile(p_id uuid)
returns table (
  id uuid, name text, tier text, pinned_badges text[], theme text,
  minutes_month int, minutes_total int, member_since timestamptz, avatar_frame text, is_admin boolean,
  avatar_url text, circles_count int
)
language sql stable security definer set search_path = public, auth as $$
  select u.id,
    coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1), 'Člen'),
    coalesce(p.tier, 'free'),
    coalesce(p.pinned_badges, '{}'),
    p.profile_theme,
    coalesce((
      select sum(w.seconds) from public.video_watch w
      where w.user_id = u.id and w.watched_at >= date_trunc('month', now())
    ), 0)::int / 60,
    coalesce((
      select sum(w.seconds) from public.video_watch w where w.user_id = u.id
    ), 0)::int / 60,
    u.created_at,
    p.avatar_frame,
    (lower(u.email) = 'schroffelh@seznam.cz'),   -- lektor (admin)
    p.avatar_url,
    coalesce((select count(*) from public.circle_members cm where cm.user_id = u.id), 0)::int
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_id;
$$;
grant execute on function public.public_profile(uuid) to authenticated;
