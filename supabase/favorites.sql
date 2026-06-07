-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – OBLÍBENÁ VIDEA (VIP srdíčko)
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.video_favorites (
  user_id    uuid not null references auth.users (id) on delete cascade,
  video_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, video_slug)
);

alter table public.video_favorites enable row level security;
grant select, insert, delete on public.video_favorites to authenticated;

-- Každý vidí a spravuje jen svoje oblíbená videa
drop policy if exists "fav select" on public.video_favorites;
create policy "fav select" on public.video_favorites
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "fav insert" on public.video_favorites;
create policy "fav insert" on public.video_favorites
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "fav delete" on public.video_favorites;
create policy "fav delete" on public.video_favorites
  for delete to authenticated using (auth.uid() = user_id);
