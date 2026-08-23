-- ════════════════════════════════════════════════════════════════════════════
--  Stálí klienti = opakované (recurring) lekce.
--  weekday: 0=Ne, 1=Po … 6=So (stejně jako availability_weekly).
--  Lekce se automaticky "objevují" každý týden a obsazují termín (busy_times).
--  Když se klient včas omluví, vznikne záznam v recurring_cancellations pro dané
--  datum → termín se uvolní (přestane být busy) a může si ho vzít někdo jiný.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.recurring_lessons (
  id          uuid primary key default gen_random_uuid(),
  client_name text not null default '',
  client_id   uuid references auth.users (id) on delete set null, -- volitelně: účet klienta (pro self-storno)
  weekday     smallint not null check (weekday between 0 and 6),
  time        text not null,          -- "HH:MM"
  price_kc    integer,
  note        text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists recurring_lessons_wd_idx on public.recurring_lessons (weekday, time);

-- Zrušené konkrétní výskyty (klient se včas omluvil / admin zrušil daný týden).
create table if not exists public.recurring_cancellations (
  id           uuid primary key default gen_random_uuid(),
  recurring_id uuid not null references public.recurring_lessons (id) on delete cascade,
  date         date not null,
  cancelled_by uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (recurring_id, date)
);

alter table public.recurring_lessons enable row level security;
alter table public.recurring_cancellations enable row level security;

grant select, insert, update, delete on public.recurring_lessons to authenticated;
grant select, insert, update, delete on public.recurring_cancellations to authenticated;

-- Admin spravuje vše; klient (přihlášený) smí zrušit svůj vlastní výskyt.
drop policy if exists "admin recurring" on public.recurring_lessons;
create policy "admin recurring" on public.recurring_lessons
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin recurring cancel" on public.recurring_cancellations;
create policy "admin recurring cancel" on public.recurring_cancellations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "klient rusi svuj vyskyt" on public.recurring_cancellations;
create policy "klient rusi svuj vyskyt" on public.recurring_cancellations
  for insert to authenticated
  with check (
    exists (select 1 from public.recurring_lessons r where r.id = recurring_id and r.client_id = auth.uid())
  );

-- ── Obsazené termíny: rezervace + vlastní lekce + opakované lekce (mimo zrušené) ──
create or replace function public.busy_times(p_from date, p_to date)
returns table(date date, "time" text)
language sql
security definer
set search_path = public
stable
as $$
  select b.date, b.time
    from public.bookings b
   where b.status <> 'cancelled' and b.date between p_from and p_to
  union
  select l.date, l.time
    from public.lesson_plans l
   where l.date between p_from and p_to
  union
  select g.d::date, r.time
    from public.recurring_lessons r
    cross join generate_series(p_from, p_to, interval '1 day') g(d)
   where r.active
     and extract(dow from g.d)::int = r.weekday
     and not exists (
       select 1 from public.recurring_cancellations c
        where c.recurring_id = r.id and c.date = g.d::date
     )
$$;

grant execute on function public.busy_times(date, date) to anon, authenticated;
