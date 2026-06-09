-- Sledování odcvičených minut videí + žebříček (dříč měsíce).
-- Funguje hned (loguje se při přehrání videa), po napojení Cloudflare
-- stačí posílat reálné sekundy přes stejnou RPC log_video_watch.
-- Spustit v Supabase SQL editoru.

-- 1) Tabulka záznamů sledování
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
-- čtení vlastních záznamů (žebříček běží přes SECURITY DEFINER RPC)
drop policy if exists "vw select own" on public.video_watch;
create policy "vw select own" on public.video_watch
  for select to authenticated using (user_id = auth.uid());

-- 2) Zápis sledování. Strop = délka videa; max 1 plný zápis za video a den
--    (aby pouhé otevření stránky nenafukovalo statistiku).
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

  -- kolik už dnes u tohoto videa máme
  select coalesce(sum(seconds), 0) into v_today
  from public.video_watch
  where user_id = auth.uid() and video_slug = p_slug
    and watched_at >= date_trunc('day', now());

  -- přičti tolik, aby denní součet u videa nepřesáhl jeho délku
  v_add := least(greatest(coalesce(p_seconds, 0), 0), greatest(v_dur - v_today, 0));
  if v_add <= 0 then return; end if;

  insert into public.video_watch (user_id, video_slug, seconds)
  values (auth.uid(), p_slug, v_add);
end;
$$;
grant execute on function public.log_video_watch(text, int) to authenticated;

-- 3) Žebříček. p_scope: 'this_month' | 'last_month' | 'all'
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
