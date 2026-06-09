-- ============================================================
--  Osobní rekord v žebříčku – nejlepší historické umístění (≤ 10.)
--  a měsíc, kdy ho člověk dosáhl. Počítá se z odcvičených minut.
--  Spustit v Supabase → SQL Editor.
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
