-- ════════════════════════════════════════════════════════════════════════════
--  SPUSTIT V SUPABASE  →  SQL Editor  →  vlož CELÉ  →  RUN
--  Obsahuje VŠECHNY novější funkce webu. Pořadí je důležité.
--  Vše je bezpečné spustit i opakovaně (if not exists / or replace).
--  Předpokládá, že základ (profiles, bookings, reviews…) už běží.
-- ════════════════════════════════════════════════════════════════════════════


-- ============================================================
--  1) Měření odcvičených minut + žebříček (dříč měsíce)
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
--  2) Customizace profilu (vzhled karty) + statistiky
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
--  3) Můj kalendář – základ (poznámky/události)
-- ============================================================

create table if not exists public.calendar_notes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  category   text not null default 'jine',
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists calendar_notes_user_day_idx on public.calendar_notes (user_id, day);

alter table public.calendar_notes enable row level security;
drop policy if exists "cn select own" on public.calendar_notes;
create policy "cn select own" on public.calendar_notes
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "cn insert own" on public.calendar_notes;
create policy "cn insert own" on public.calendar_notes
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "cn update own" on public.calendar_notes;
create policy "cn update own" on public.calendar_notes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "cn delete own" on public.calendar_notes;
create policy "cn delete own" on public.calendar_notes
  for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.calendar_notes to authenticated;


-- ============================================================
--  4) Můj kalendář v2 – vlastní kategorie (až 8) + události s časem
-- ============================================================

create table if not exists public.calendar_categories (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text not null default 'Kategorie',
  color      text not null default 'sky',
  position   int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists calendar_categories_user_idx on public.calendar_categories (user_id, position);

alter table public.calendar_categories enable row level security;
drop policy if exists "cc select own" on public.calendar_categories;
create policy "cc select own" on public.calendar_categories
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "cc insert own" on public.calendar_categories;
create policy "cc insert own" on public.calendar_categories
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "cc update own" on public.calendar_categories;
create policy "cc update own" on public.calendar_categories
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "cc delete own" on public.calendar_categories;
create policy "cc delete own" on public.calendar_categories
  for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.calendar_categories to authenticated;

alter table public.calendar_notes add column if not exists category_id bigint references public.calendar_categories(id) on delete set null;
alter table public.calendar_notes add column if not exists at_time time;
alter table public.calendar_notes add column if not exists note text;


-- ============================================================
--  5) Osobní rekord v žebříčku (nejlepší umístění ≤ 10. + měsíc)
-- ============================================================

create or replace function public.personal_best_rank(p_id uuid)
returns table (rank int, month date)
language sql stable security definer set search_path = public as $$
  with monthly as (
    select date_trunc('month', watched_at)::date as m, user_id, sum(seconds) as secs
    from public.video_watch
    group by 1, 2
  ),
  ranked as (
    select m, user_id, row_number() over (partition by m order by secs desc)::int as rnk
    from monthly
  )
  select rnk, m
  from ranked
  where user_id = p_id and rnk <= 10
  order by rnk asc, m asc
  limit 1;
$$;
grant execute on function public.personal_best_rank(uuid) to authenticated;


-- ============================================================
--  6) Smazání vlastního účtu (GDPR – smaže VŠECHNO, nenávratně)
-- ============================================================

create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth, storage as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Nepřihlášený uživatel.'; end if;
  delete from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = uid::text;
  delete from storage.objects where bucket_id = 'community' and owner = uid;
  delete from public.bookings where user_id = uid;
  delete from public.reviews  where user_id = uid;
  delete from auth.users where id = uid;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;


-- ============================================================
--  7) Prémiový rámeček fotky podle umístění (bronz/stříbro/zlato)
--     (přepisuje public_profile z bodu 2 – přidává avatar_frame)
-- ============================================================

alter table public.profiles add column if not exists avatar_frame text;

create or replace function public.set_avatar_frame(p_frame text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  best int;
  allowed boolean;
begin
  if auth.uid() is null then return null; end if;
  if p_frame is null or btrim(p_frame) = '' then
    update public.profiles set avatar_frame = null where id = auth.uid();
    return null;
  end if;
  select min(rnk) into best from (
    select row_number() over (partition by m order by secs desc)::int as rnk, uid
    from (
      select date_trunc('month', watched_at) as m, user_id as uid, sum(seconds) as secs
      from public.video_watch group by 1, 2
    ) t
  ) r where r.uid = auth.uid();
  allowed :=
    (p_frame = 'gold'   and best is not null and best <= 1) or
    (p_frame = 'silver' and best is not null and best <= 2) or
    (p_frame = 'bronze' and best is not null and best <= 3);
  if not allowed then return null; end if;
  update public.profiles set avatar_frame = p_frame where id = auth.uid();
  return p_frame;
end;
$$;
grant execute on function public.set_avatar_frame(text) to authenticated;

drop function if exists public.public_profile(uuid);
create or replace function public.public_profile(p_id uuid)
returns table (
  id uuid, name text, tier text, pinned_badges text[], theme text,
  minutes_month int, minutes_total int, member_since timestamptz, avatar_frame text
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
    p.avatar_frame
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_id;
$$;
grant execute on function public.public_profile(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
--  HOTOVO. Když to proběhlo bez červené chyby, vše nové je nasazené. ✅
-- ════════════════════════════════════════════════════════════════════════════
