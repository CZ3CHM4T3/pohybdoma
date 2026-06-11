-- ============================================================
--  Analytika pro admin: sledování návštěv + souhrnná statistika.
--  Spustit v Supabase → SQL Editor.
-- ============================================================

-- 1) Návštěvy stránek (bez cookies, jen cesta + čas + případně uživatel)
create table if not exists public.page_views (
  id   bigint generated always as identity primary key,
  path text not null,
  uid  uuid,
  at   timestamptz not null default now()
);
create index if not exists page_views_at_idx on public.page_views (at);

alter table public.page_views enable row level security;
drop policy if exists "pv insert" on public.page_views;
create policy "pv insert" on public.page_views
  for insert to anon, authenticated with check (true);
grant insert on public.page_views to anon, authenticated;

-- 2) Souhrnná statistika (jen admin) – vrací jeden JSON objekt
create or replace function public.admin_stats()
returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Nedostatecna opravneni'; end if;
  select jsonb_build_object(
    'members', jsonb_build_object(
      'total',    (select count(*) from public.profiles),
      'free',     (select count(*) from public.profiles where coalesce(tier,'free') = 'free'),
      'member',   (select count(*) from public.profiles where tier = 'member'),
      'vip',      (select count(*) from public.profiles where tier = 'vip'),
      'vip_plus', (select count(*) from public.profiles where tier = 'vip_plus')
    ),
    'reg7',  (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'reg30', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'reg_daily', (
      select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d), '[]'::jsonb)
      from (select (created_at)::date d, count(*) n from auth.users
            where created_at >= now() - interval '30 days' group by 1) t
    ),
    'bookings', jsonb_build_object(
      'total',  (select count(*) from public.bookings),
      'last7',  (select count(*) from public.bookings where created_at >= now() - interval '7 days'),
      'last30', (select count(*) from public.bookings where created_at >= now() - interval '30 days')
    ),
    'minutes30', coalesce((select sum(seconds) from public.video_watch where watched_at >= now() - interval '30 days'), 0) / 60,
    'active7',   (select count(distinct user_id) from public.video_watch where watched_at >= now() - interval '7 days'),
    'subscribers',    (select count(*) from public.subscribers),
    'brags',          (select count(*) from public.brags),
    'challenges_done',(select count(*) from public.challenge_done),
    'top_videos', (
      select coalesce(jsonb_agg(jsonb_build_object('slug', slug, 'minutes', mins) order by mins desc), '[]'::jsonb)
      from (select video_slug slug, (sum(seconds)/60)::int mins from public.video_watch group by 1 order by 2 desc limit 8) t
    ),
    'pv', jsonb_build_object(
      'total30', (select count(*) from public.page_views where at >= now() - interval '30 days'),
      'today',   (select count(*) from public.page_views where at >= date_trunc('day', now())),
      'daily', (
        select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d), '[]'::jsonb)
        from (select (at)::date d, count(*) n from public.page_views where at >= now() - interval '30 days' group by 1) t
      ),
      'top', (
        select coalesce(jsonb_agg(jsonb_build_object('path', path, 'n', n) order by n desc), '[]'::jsonb)
        from (select path, count(*) n from public.page_views where at >= now() - interval '30 days' group by 1 order by 2 desc limit 8) t
      )
    )
  ) into result;
  return result;
end;
$$;
grant execute on function public.admin_stats() to authenticated;
