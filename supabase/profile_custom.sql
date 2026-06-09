-- Customizace profilu: vlastní vzhled (pozadí karty) + statistiky člena.
-- Nahrazuje dřívější motto/cíl/oblíbené (ty se už nepoužívají).
-- Spustit v Supabase SQL editoru.

-- 1) Sloupec s vybraným vzhledem
alter table public.profiles add column if not exists profile_theme text;

-- 2) Uložení vlastního vzhledu
create or replace function public.set_profile_theme(p_theme text)
returns void
language sql security definer set search_path = public as $$
  update public.profiles set profile_theme = nullif(btrim(left(coalesce(p_theme, ''), 24)), '')
  where id = auth.uid();
$$;
grant execute on function public.set_profile_theme(text) to authenticated;

-- 3) Veřejný profil: jméno, úroveň, odznaky, vzhled + statistiky (minuty, člen od)
drop function if exists public.public_profile(uuid);
create or replace function public.public_profile(p_id uuid)
returns table (
  id uuid, name text, tier text, pinned_badges text[], theme text,
  minutes_month int, minutes_total int, member_since timestamptz
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
    u.created_at
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_id;
$$;
grant execute on function public.public_profile(uuid) to authenticated;
