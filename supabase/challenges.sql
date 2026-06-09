-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – Měsíční výzva (pro všechny). Spusť v Supabase SQL Editoru.
--  Předpoklad: is_admin() (admin-policies.sql).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.challenges (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text default '',
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.challenges enable row level security;
grant select on public.challenges to anon, authenticated;
grant insert, update, delete on public.challenges to authenticated;

drop policy if exists "challenges read" on public.challenges;
create policy "challenges read" on public.challenges
  for select to anon, authenticated using (true);

drop policy if exists "challenges admin" on public.challenges;
create policy "challenges admin" on public.challenges
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Kdo výzvu splnil (pro radost + počítadlo)
create table if not exists public.challenge_done (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

alter table public.challenge_done enable row level security;
grant select, insert, delete on public.challenge_done to authenticated;

drop policy if exists "challenge_done read" on public.challenge_done;
create policy "challenge_done read" on public.challenge_done
  for select to authenticated using (true);

drop policy if exists "challenge_done insert own" on public.challenge_done;
create policy "challenge_done insert own" on public.challenge_done
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "challenge_done delete own" on public.challenge_done;
create policy "challenge_done delete own" on public.challenge_done
  for delete to authenticated using (user_id = auth.uid());
