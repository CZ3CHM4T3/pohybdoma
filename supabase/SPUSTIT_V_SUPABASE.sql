-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA — VŠECHNO SQL V JEDNOM
--  Spustit v Supabase → SQL Editor → vlož CELÉ → RUN.
--  Bezpečné i opakovaně. Předpokládá, že základ webu (profiles, bookings,
--  reviews, lesson_progress, diary_entries, video_favorites, brags,
--  challenge_done, friendships, circle_members, subscribers, funkce is_admin(),
--  storage buckety 'avatars' a 'community') už běží.
-- ════════════════════════════════════════════════════════════════════════════


-- ============================================================
--  1) Měření odcvičených minut + žebříček
-- ============================================================
create table if not exists public.video_watch (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  video_slug text not null,
  seconds int not null check (seconds >= 0),
  watched_at timestamptz not null default now()
);
create index if not exists video_watch_user_idx on public.video_watch (user_id);
create index if not exists video_watch_time_idx on public.video_watch (watched_at);
alter table public.video_watch enable row level security;
drop policy if exists "vw select own" on public.video_watch;
create policy "vw select own" on public.video_watch for select to authenticated using (user_id = auth.uid());

create or replace function public.log_video_watch(p_slug text, p_seconds int)
returns void language plpgsql security definer set search_path = public as $$
declare v_dur int; v_today int; v_add int;
begin
  if auth.uid() is null or p_slug is null then return; end if;
  select coalesce(duration_seconds, 0) into v_dur from public.videos where slug = p_slug;
  if v_dur is null then v_dur := 0; end if;
  select coalesce(sum(seconds), 0) into v_today from public.video_watch
   where user_id = auth.uid() and video_slug = p_slug and watched_at >= date_trunc('day', now());
  v_add := least(greatest(coalesce(p_seconds, 0), 0), greatest(v_dur - v_today, 0));
  if v_add <= 0 then return; end if;
  insert into public.video_watch (user_id, video_slug, seconds) values (auth.uid(), p_slug, v_add);
end; $$;
grant execute on function public.log_video_watch(text, int) to authenticated;

create or replace function public.video_leaderboard(p_scope text default 'this_month', p_limit int default 3)
returns table (user_id uuid, name text, minutes int, rank int)
language sql stable security definer set search_path = public, auth as $$
  with bounds as (
    select
      case when p_scope = 'last_month' then date_trunc('month', now()) - interval '1 month'
           when p_scope = 'all' then timestamptz '1970-01-01'
           else date_trunc('month', now()) end as lo,
      case when p_scope = 'last_month' then date_trunc('month', now())
           else now() + interval '1 second' end as hi
  ),
  agg as (
    select w.user_id, sum(w.seconds) as secs from public.video_watch w, bounds b
    where w.watched_at >= b.lo and w.watched_at < b.hi group by w.user_id
  )
  select a.user_id,
    coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1), 'Člen'),
    (a.secs / 60)::int, row_number() over (order by a.secs desc)::int
  from agg a join auth.users u on u.id = a.user_id
  left join public.profiles p on p.id = a.user_id
  where a.secs > 0 order by a.secs desc limit greatest(p_limit, 1);
$$;
grant execute on function public.video_leaderboard(text, int) to authenticated;


-- ============================================================
--  2) Můj kalendář (poznámky + vlastní kategorie + události)
-- ============================================================
create table if not exists public.calendar_notes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null, category text not null default 'jine', body text not null,
  created_at timestamptz not null default now()
);
create index if not exists calendar_notes_user_day_idx on public.calendar_notes (user_id, day);
alter table public.calendar_notes enable row level security;
drop policy if exists "cn select own" on public.calendar_notes;
create policy "cn select own" on public.calendar_notes for select to authenticated using (user_id = auth.uid());
drop policy if exists "cn insert own" on public.calendar_notes;
create policy "cn insert own" on public.calendar_notes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "cn update own" on public.calendar_notes;
create policy "cn update own" on public.calendar_notes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "cn delete own" on public.calendar_notes;
create policy "cn delete own" on public.calendar_notes for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.calendar_notes to authenticated;

create table if not exists public.calendar_categories (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Kategorie', color text not null default 'sky',
  position int not null default 0, created_at timestamptz not null default now()
);
create index if not exists calendar_categories_user_idx on public.calendar_categories (user_id, position);
alter table public.calendar_categories enable row level security;
drop policy if exists "cc select own" on public.calendar_categories;
create policy "cc select own" on public.calendar_categories for select to authenticated using (user_id = auth.uid());
drop policy if exists "cc insert own" on public.calendar_categories;
create policy "cc insert own" on public.calendar_categories for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "cc update own" on public.calendar_categories;
create policy "cc update own" on public.calendar_categories for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "cc delete own" on public.calendar_categories;
create policy "cc delete own" on public.calendar_categories for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.calendar_categories to authenticated;
alter table public.calendar_notes add column if not exists category_id bigint references public.calendar_categories(id) on delete set null;
alter table public.calendar_notes add column if not exists at_time time;
alter table public.calendar_notes add column if not exists note text;


-- ============================================================
--  3) Sloupce profilu (vzhled, rámeček, oblíbená aktivita, členství)
-- ============================================================
alter table public.profiles add column if not exists profile_theme text;
alter table public.profiles add column if not exists avatar_frame text;
alter table public.profiles add column if not exists fav_activity text;
alter table public.profiles add column if not exists tier_since timestamptz;
alter table public.profiles add column if not exists tier_until timestamptz;
alter table public.profiles add column if not exists bonus_days int not null default 0;

create or replace function public.set_profile_theme(p_theme text)
returns void language sql security definer set search_path = public as $$
  update public.profiles set profile_theme = nullif(btrim(left(coalesce(p_theme, ''), 24)), '') where id = auth.uid();
$$;
grant execute on function public.set_profile_theme(text) to authenticated;

create or replace function public.set_fav_activity(p_val text)
returns void language sql security definer set search_path = public as $$
  update public.profiles set fav_activity = nullif(btrim(left(coalesce(p_val, ''), 40)), '') where id = auth.uid();
$$;
grant execute on function public.set_fav_activity(text) to authenticated;

create or replace function public.set_avatar_frame(p_frame text)
returns text language plpgsql security definer set search_path = public as $$
declare best int; allowed boolean;
begin
  if auth.uid() is null then return null; end if;
  if p_frame is null or btrim(p_frame) = '' then
    update public.profiles set avatar_frame = null where id = auth.uid(); return null;
  end if;
  select min(rnk) into best from (
    select row_number() over (partition by m order by secs desc)::int as rnk, uid from (
      select date_trunc('month', watched_at) as m, user_id as uid, sum(seconds) as secs
      from public.video_watch group by 1, 2
    ) t
  ) r where r.uid = auth.uid();
  allowed := (p_frame='gold' and best is not null and best<=1)
          or (p_frame='silver' and best is not null and best<=2)
          or (p_frame='bronze' and best is not null and best<=3);
  if not allowed then return null; end if;
  update public.profiles set avatar_frame = p_frame where id = auth.uid();
  return p_frame;
end; $$;
grant execute on function public.set_avatar_frame(text) to authenticated;


-- ============================================================
--  4) Veřejný profil (vše) + statistiky + osobní rekord
-- ============================================================
drop function if exists public.public_profile(uuid);
create or replace function public.public_profile(p_id uuid)
returns table (
  id uuid, name text, tier text, pinned_badges text[], theme text,
  minutes_month int, minutes_total int, member_since timestamptz, avatar_frame text, is_admin boolean,
  avatar_url text, circles_count int, fav_activity text
)
language sql stable security definer set search_path = public, auth as $$
  select u.id,
    coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1), 'Člen'),
    coalesce(p.tier, 'free'),
    coalesce(p.pinned_badges, '{}'),
    p.profile_theme,
    coalesce((select sum(w.seconds) from public.video_watch w where w.user_id = u.id and w.watched_at >= date_trunc('month', now())), 0)::int / 60,
    coalesce((select sum(w.seconds) from public.video_watch w where w.user_id = u.id), 0)::int / 60,
    u.created_at,
    p.avatar_frame,
    (lower(u.email) = 'schroffelh@seznam.cz'),
    p.avatar_url,
    coalesce((select count(*) from public.circle_members cm where cm.user_id = u.id), 0)::int,
    p.fav_activity
  from auth.users u left join public.profiles p on p.id = u.id where u.id = p_id;
$$;
grant execute on function public.public_profile(uuid) to authenticated;

create or replace function public.personal_best_rank(p_id uuid)
returns table (rank int, month date)
language sql stable security definer set search_path = public as $$
  with monthly as (
    select date_trunc('month', watched_at)::date as m, user_id, sum(seconds) as secs
    from public.video_watch group by 1, 2
  ),
  ranked as (
    select m, user_id, row_number() over (partition by m order by secs desc)::int as rnk from monthly
  )
  select rnk, m from ranked where user_id = p_id and rnk <= 10 order by rnk asc, m asc limit 1;
$$;
grant execute on function public.personal_best_rank(uuid) to authenticated;

create or replace function public.profile_stats(p_id uuid)
returns table (lessons int, diary int, favorites int, brags int, challenges int, buddies int, last_active timestamptz, streak int)
language sql stable security definer set search_path = public as $$
  with days as (select distinct (watched_at)::date as d from public.video_watch where user_id = p_id)
  select
    coalesce((select count(*) from public.lesson_progress where user_id = p_id and completed), 0)::int,
    coalesce((select count(*) from public.diary_entries where user_id = p_id), 0)::int,
    coalesce((select count(*) from public.video_favorites where user_id = p_id), 0)::int,
    coalesce((select count(*) from public.brags where author_id = p_id), 0)::int,
    coalesce((select count(*) from public.challenge_done where user_id = p_id), 0)::int,
    coalesce((select count(*) from public.friendships where status = 'accepted' and (requester_id = p_id or addressee_id = p_id)), 0)::int,
    (select max(watched_at) from public.video_watch where user_id = p_id),
    coalesce((
      select case when (select max(d) from days) >= current_date - 1 then (
        select count(*) from (select d + (row_number() over (order by d desc)) * interval '1 day' as anchor from days) t
        where anchor = (select max(d) from days) + interval '1 day'
      ) else 0 end
    ), 0)::int;
$$;
grant execute on function public.profile_stats(uuid) to authenticated;


-- ============================================================
--  5) Smazání vlastního účtu (GDPR)
-- ============================================================
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth, storage as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Nepřihlášený uživatel.'; end if;
  begin delete from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = uid::text; exception when others then null; end;
  begin delete from storage.objects where bucket_id = 'community' and owner = uid; exception when others then null; end;
  begin delete from public.bookings where user_id = uid; exception when others then null; end;
  begin delete from public.reviews where user_id = uid; exception when others then null; end;
  delete from auth.users where id = uid;
end; $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;


-- ============================================================
--  6) Finanční deník (admin)
-- ============================================================
create table if not exists public.finance_entries (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('income','expense')),
  category text not null, amount_kc numeric not null check (amount_kc >= 0),
  note text, at date not null default current_date, created_at timestamptz not null default now()
);
create index if not exists finance_entries_idx on public.finance_entries (kind, at desc);
alter table public.finance_entries enable row level security;
drop policy if exists "fin admin all" on public.finance_entries;
create policy "fin admin all" on public.finance_entries for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.finance_entries to authenticated;


-- ============================================================
--  7) Členství: nastavení úrovně, bonusy, přidání dní (+ auto-tržba)
-- ============================================================
create or replace function public.set_user_tier(target_id uuid, new_tier text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Nedostatecna opravneni'; end if;
  if new_tier not in ('free','member','vip','vip_plus') then raise exception 'Neplatna uroven: %', new_tier; end if;
  if new_tier = 'free' then
    update public.profiles set tier = new_tier, tier_since = null, tier_until = null where id = target_id;
  else
    update public.profiles set tier = new_tier, tier_since = now(),
      tier_until = now() + make_interval(days => 30 + coalesce(bonus_days, 0)) where id = target_id;
  end if;
end; $$;
grant execute on function public.set_user_tier(uuid, text) to authenticated;

create or replace function public.grant_bonus_days(target_id uuid, days int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Nedostatecna opravneni'; end if;
  update public.profiles set bonus_days = greatest(0, coalesce(bonus_days, 0) + days),
    tier_until = case when tier_until is not null then tier_until + make_interval(days => days)
                      when tier is not null and tier <> 'free' then now() + make_interval(days => days)
                      else tier_until end
  where id = target_id;
end; $$;
grant execute on function public.grant_bonus_days(uuid, int) to authenticated;

drop function if exists public.add_membership_days(uuid, text, int);
create or replace function public.add_membership_days(target_id uuid, p_tier text, p_days int, p_log_income boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare v_price numeric;
begin
  if not public.is_admin() then raise exception 'Nedostatecna opravneni'; end if;
  if p_tier not in ('member','vip','vip_plus') then raise exception 'Neplatna uroven'; end if;
  if coalesce(p_days, 0) = 0 then return; end if;
  update public.profiles set tier = p_tier,
    tier_since = case when coalesce(tier, 'free') <> p_tier then now() else coalesce(tier_since, now()) end,
    tier_until = greatest(coalesce(tier_until, now()), now()) + make_interval(days => p_days)
  where id = target_id;
  if p_log_income then
    v_price := case p_tier when 'member' then 199 when 'vip' then 399 when 'vip_plus' then 599 else 0 end;
    if v_price > 0 then
      begin insert into public.finance_entries (kind, category, amount_kc, note)
        values ('income', case p_tier when 'member' then 'MEMBER' when 'vip' then 'VIP' else 'VIP+' end,
                round(v_price * p_days / 30.0), 'Členství (admin)');
      exception when others then null; end;
    end if;
  end if;
end; $$;
grant execute on function public.add_membership_days(uuid, text, int, boolean) to authenticated;


-- ============================================================
--  8) Dárkové kódy (+ auto-tržba)
-- ============================================================
create table if not exists public.gift_codes (
  id bigint generated always as identity primary key,
  code text not null unique,
  tier text not null check (tier in ('member','vip','vip_plus')),
  months int not null default 1 check (months between 1 and 24),
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz, created_at timestamptz not null default now()
);
alter table public.gift_codes enable row level security;
revoke all on public.gift_codes from anon, authenticated;

drop function if exists public.create_gift_code(text, int);
create or replace function public.create_gift_code(p_tier text, p_months int, p_log_income boolean default true)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text; v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; v_months int := greatest(1, least(24, p_months)); v_price numeric; i int;
begin
  if not public.is_admin() then raise exception 'Nedostatecna opravneni'; end if;
  if p_tier not in ('member','vip','vip_plus') then raise exception 'Neplatna uroven'; end if;
  loop
    v_code := 'DAR-';
    for i in 1..4 loop v_code := v_code || substr(v_chars, 1 + floor(random()*length(v_chars))::int, 1); end loop;
    v_code := v_code || '-';
    for i in 1..4 loop v_code := v_code || substr(v_chars, 1 + floor(random()*length(v_chars))::int, 1); end loop;
    exit when not exists (select 1 from public.gift_codes where code = v_code);
  end loop;
  insert into public.gift_codes (code, tier, months) values (v_code, p_tier, v_months);
  if p_log_income then
    v_price := case p_tier when 'member' then 199 when 'vip' then 399 when 'vip_plus' then 599 else 0 end;
    if v_price > 0 then
      begin insert into public.finance_entries (kind, category, amount_kc, note)
        values ('income', case p_tier when 'member' then 'MEMBER' when 'vip' then 'VIP' else 'VIP+' end,
                round(v_price * v_months), 'Dárkové členství');
      exception when others then null; end;
    end if;
  end if;
  return v_code;
end; $$;
grant execute on function public.create_gift_code(text, int, boolean) to authenticated;

create or replace function public.list_gift_codes()
returns jsonb language sql security definer set search_path = public, auth as $$
  select case when public.is_admin() then coalesce((
    select jsonb_agg(jsonb_build_object('code', g.code, 'tier', g.tier, 'months', g.months,
      'redeemed', g.redeemed_by is not null, 'redeemed_at', g.redeemed_at, 'created_at', g.created_at) order by g.created_at desc)
    from public.gift_codes g
  ), '[]'::jsonb) else '[]'::jsonb end;
$$;
grant execute on function public.list_gift_codes() to authenticated;

create or replace function public.redeem_gift_code(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare g record;
begin
  if auth.uid() is null then return 'not_logged'; end if;
  select * into g from public.gift_codes where code = upper(btrim(p_code));
  if not found then return 'invalid'; end if;
  if g.redeemed_by is not null then return 'used'; end if;
  update public.gift_codes set redeemed_by = auth.uid(), redeemed_at = now() where id = g.id;
  update public.profiles set tier = g.tier, tier_since = now(),
    tier_until = greatest(coalesce(tier_until, now()), now()) + make_interval(months => g.months) where id = auth.uid();
  return 'ok:' || g.tier;
end; $$;
grant execute on function public.redeem_gift_code(text) to authenticated;


-- ============================================================
--  9) Video u měsíční výzvy
-- ============================================================
alter table public.challenges add column if not exists video_uid text;


-- ============================================================
--  10) Onboarding průvodce (+ výchozí kroky, jen když je prázdno)
-- ============================================================
create table if not exists public.onboarding_steps (
  id bigint generated always as identity primary key,
  position int not null default 0, title text not null, body text not null default '',
  image_url text, cx real not null default 50, cy real not null default 50, radius real not null default 10,
  href text, created_at timestamptz not null default now()
);
create index if not exists onboarding_steps_pos_idx on public.onboarding_steps (position);
alter table public.onboarding_steps add column if not exists href text;
alter table public.onboarding_steps enable row level security;
drop policy if exists "ob read" on public.onboarding_steps;
create policy "ob read" on public.onboarding_steps for select to authenticated using (true);
drop policy if exists "ob admin write" on public.onboarding_steps;
create policy "ob admin write" on public.onboarding_steps for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.onboarding_steps to authenticated;

insert into public.onboarding_steps (position, title, body, href)
select v.position, v.title, v.body, v.href from (values
  (1, 'Vítej v POHYB DOMA!', 'Za minutku tě provedu tím nejdůležitějším – kde co najdeš a jak to funguje. Kdykoliv můžeš dát „Přeskočit".', null),
  (2, 'Knihovna pohybu', 'Tady jsou všechna cvičební videa. Filtry ti pomůžou najít přesně to svoje. A když nevíš, do čeho se pustit, tlačítko „Náhodně" ti video vybere za tebe.', '/videoknihovna'),
  (3, 'Moje cesta – tvoje základna', 'Tvůj účet má všechno pod jednou střechou: videa, kurzy, rezervace, stav členství, kruhy i deník.', '/ucet'),
  (4, 'Můj deník', 'Zapisuj si váhu, energii, spánek, bolest a trénink. V grafu pak uvidíš svůj posun.', '/denik'),
  (5, 'Můj kalendář', 'Plánuj si tréninky i poznámky. Vlastní barevné kategorie, čas a detaily u každé události.', '/ucet'),
  (6, 'Komunita: Kruhy, Chlubírna a Buddies', 'Najdi parťáky se stejným cílem, pochlub se pokrokem a piš si s nimi naživo.', '/kruhy'),
  (7, 'Výzvy, žebříček a odznaky', 'Každý měsíc krátká výzva. Za aktivitu sbíráš odznaky a posouváš se v žebříčku dříčů. 💪', '/ucet'),
  (8, 'A teď hlavně začni', 'Vyber si jedno video a pusť se do toho. Tvoje možnosti, tvoje cesta – a já jsem ti k ruce. — Honza', '/videoknihovna')
) as v(position, title, body, href)
where not exists (select 1 from public.onboarding_steps);


-- ============================================================
--  11) Analytika (sledování návštěv + souhrn)
-- ============================================================
create table if not exists public.page_views (
  id bigint generated always as identity primary key,
  path text not null, uid uuid, at timestamptz not null default now()
);
create index if not exists page_views_at_idx on public.page_views (at);
alter table public.page_views enable row level security;
drop policy if exists "pv insert" on public.page_views;
create policy "pv insert" on public.page_views for insert to anon, authenticated with check (true);
grant insert on public.page_views to anon, authenticated;

create or replace function public.admin_stats()
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Nedostatecna opravneni'; end if;
  select jsonb_build_object(
    'members', jsonb_build_object(
      'total', (select count(*) from public.profiles),
      'free', (select count(*) from public.profiles where coalesce(tier,'free') = 'free'),
      'member', (select count(*) from public.profiles where tier = 'member'),
      'vip', (select count(*) from public.profiles where tier = 'vip'),
      'vip_plus', (select count(*) from public.profiles where tier = 'vip_plus')),
    'reg7', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'reg30', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'reg_daily', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d), '[]'::jsonb)
      from (select (created_at)::date d, count(*) n from auth.users where created_at >= now() - interval '30 days' group by 1) t),
    'bookings', jsonb_build_object(
      'total', (select count(*) from public.bookings),
      'last7', (select count(*) from public.bookings where created_at >= now() - interval '7 days'),
      'last30', (select count(*) from public.bookings where created_at >= now() - interval '30 days')),
    'minutes30', coalesce((select sum(seconds) from public.video_watch where watched_at >= now() - interval '30 days'), 0) / 60,
    'active7', (select count(distinct user_id) from public.video_watch where watched_at >= now() - interval '7 days'),
    'subscribers', (select count(*) from public.subscribers),
    'brags', (select count(*) from public.brags),
    'challenges_done', (select count(*) from public.challenge_done),
    'top_videos', (select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'minutes', mins) order by mins desc), '[]'::jsonb)
      from (select video_slug slug, (sum(seconds)/60)::int mins from public.video_watch group by 1 order by 2 desc limit 8) t),
    'pv', jsonb_build_object(
      'total30', (select count(*) from public.page_views where at >= now() - interval '30 days'),
      'today', (select count(*) from public.page_views where at >= date_trunc('day', now())),
      'daily', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d), '[]'::jsonb)
        from (select (at)::date d, count(*) n from public.page_views where at >= now() - interval '30 days' group by 1) t),
      'top', (select coalesce(jsonb_agg(jsonb_build_object('path', path, 'n', n) order by n desc), '[]'::jsonb)
        from (select path, count(*) n from public.page_views where at >= now() - interval '30 days' group by 1 order by 2 desc limit 8) t))
  ) into result;
  return result;
end; $$;
grant execute on function public.admin_stats() to authenticated;


-- ============================================================
--  12) Blog
-- ============================================================
create table if not exists public.blog_posts (
  id bigint generated always as identity primary key,
  slug text not null unique, title text not null, content text not null default '',
  cover_url text, published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists blog_posts_pub_idx on public.blog_posts (published, created_at desc);
alter table public.blog_posts enable row level security;
drop policy if exists "blog read" on public.blog_posts;
create policy "blog read" on public.blog_posts for select to anon, authenticated using (published = true or public.is_admin());
drop policy if exists "blog admin write" on public.blog_posts;
create policy "blog admin write" on public.blog_posts for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.blog_posts to anon;
grant select, insert, update, delete on public.blog_posts to authenticated;


-- ============================================================
--  13) Admin: vyhození člena (kick)
-- ============================================================
create or replace function public.admin_kick_member(target_id uuid)
returns void language plpgsql security definer set search_path = public, auth, storage as $$
declare target_is_admin boolean;
begin
  if not public.is_admin() then raise exception 'Nedostatecna opravneni'; end if;
  if target_id = auth.uid() then raise exception 'Sebe vyhodit nelze'; end if;
  select (lower(email) = 'schroffelh@seznam.cz') into target_is_admin from auth.users where id = target_id;
  if coalesce(target_is_admin, false) then raise exception 'Admina vyhodit nelze'; end if;
  begin delete from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = target_id::text; exception when others then null; end;
  begin delete from storage.objects where bucket_id = 'community' and owner = target_id; exception when others then null; end;
  begin delete from public.bookings where user_id = target_id; exception when others then null; end;
  begin delete from public.reviews where user_id = target_id; exception when others then null; end;
  delete from auth.users where id = target_id;
end; $$;
revoke all on function public.admin_kick_member(uuid) from public, anon;
grant execute on function public.admin_kick_member(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
--  HOTOVO ✅  Když to proběhlo bez červené chyby, vše je nasazené.
-- ════════════════════════════════════════════════════════════════════════════
