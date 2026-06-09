-- ============================================================
--  SPUSTIT V SUPABASE  →  SQL Editor  →  vlož celé  →  RUN
--  Pořadí je důležité (část 2 používá tabulku z části 1).
--  Vše je bezpečné spustit i opakovaně (if not exists / or replace).
-- ============================================================


-- ============================================================
--  ČÁST 1 — Měření odcvičených minut + žebříček (dříč měsíce)
-- ============================================================

create table if not exists public.video_watch (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  video_slug text not null,
  seconds    int  not null check (seconds >= 0),
  watched_at timestamptz not null default now()
);
create index if not exists video_watch_user_idx on public.video_watch (user_id);
create index if not exists video_watch_time_idx on public.video_watch (watched_at);

alter table public.video_watch enable row level security;
drop policy if exists "vw select own" on public.video_watch;
create policy "vw select own" on public.video_watch
  for select to authenticated using (user_id = auth.uid());

create or replace function public.log_video_watch(p_slug text, p_seconds int)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_dur int;
  v_today int;
  v_add int;
begin
  if auth.uid() is null or p_slug is null then return; end if;
  select coalesce(duration_seconds, 0) into v_dur from public.videos where slug = p_slug;
  if v_dur is null then v_dur := 0; end if;
  select coalesce(sum(seconds), 0) into v_today
  from public.video_watch
  where user_id = auth.uid() and video_slug = p_slug
    and watched_at >= date_trunc('day', now());
  v_add := least(greatest(coalesce(p_seconds, 0), 0), greatest(v_dur - v_today, 0));
  if v_add <= 0 then return; end if;
  insert into public.video_watch (user_id, video_slug, seconds)
  values (auth.uid(), p_slug, v_add);
end;
$$;
grant execute on function public.log_video_watch(text, int) to authenticated;

create or replace function public.video_leaderboard(p_scope text default 'this_month', p_limit int default 3)
returns table (user_id uuid, name text, minutes int, rank int)
language sql stable security definer set search_path = public, auth as $$
  with bounds as (
    select
      case
        when p_scope = 'last_month' then date_trunc('month', now()) - interval '1 month'
        when p_scope = 'all'        then timestamptz '1970-01-01'
        else date_trunc('month', now())
      end as lo,
      case
        when p_scope = 'last_month' then date_trunc('month', now())
        else now() + interval '1 second'
      end as hi
  ),
  agg as (
    select w.user_id, sum(w.seconds) as secs
    from public.video_watch w, bounds b
    where w.watched_at >= b.lo and w.watched_at < b.hi
    group by w.user_id
  )
  select a.user_id,
    coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1), 'Člen') as name,
    (a.secs / 60)::int as minutes,
    row_number() over (order by a.secs desc)::int as rank
  from agg a
  join auth.users u on u.id = a.user_id
  left join public.profiles p on p.id = a.user_id
  where a.secs > 0
  order by a.secs desc
  limit greatest(p_limit, 1);
$$;
grant execute on function public.video_leaderboard(text, int) to authenticated;


-- ============================================================
--  ČÁST 2 — Customizace profilu (vzhled karty) + statistiky
--  (nahrazuje dřívější profile_life.sql – ten už nespouštěj)
-- ============================================================

alter table public.profiles add column if not exists profile_theme text;

create or replace function public.set_profile_theme(p_theme text)
returns void
language sql security definer set search_path = public as $$
  update public.profiles set profile_theme = nullif(btrim(left(coalesce(p_theme, ''), 24)), '')
  where id = auth.uid();
$$;
grant execute on function public.set_profile_theme(text) to authenticated;

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

-- ============================================================
--  HOTOVO ✅
-- ============================================================
