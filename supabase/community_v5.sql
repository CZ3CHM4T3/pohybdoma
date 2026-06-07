-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – VIP+ KLUB v5: Ankety + Feedback
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
--  Předpoklad: community.sql + v2 + v3 + v4.
--  Ankety i feedback jsou „posty" (channel 'poll' / 'feedback'), takže pod nimi
--  funguje stejná diskuze (komentáře + reakce) jako v chatu.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Rozšíření postů: titulek (feedback) + hodnocení + nové kanály ─────────
alter table public.community_posts add column if not exists title text;
alter table public.community_posts add column if not exists rating smallint;

do $$ begin
  alter table public.community_posts drop constraint if exists community_posts_channel_chk;
exception when others then null; end $$;
do $$ begin
  alter table public.community_posts add constraint community_posts_channel_chk
    check (channel in ('chat', 'qa', 'poll', 'feedback'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.community_posts add constraint community_posts_rating_chk
    check (rating is null or rating between 1 and 5);
exception when duplicate_object then null; end $$;

-- ── 2) Možnosti ankety + hlasy ──────────────────────────────────────────────
create table if not exists public.community_poll_options (
  id       uuid primary key default gen_random_uuid(),
  post_id  uuid not null references public.community_posts (id) on delete cascade,
  label    text not null,
  position int  not null default 0
);
create index if not exists community_poll_options_post_idx
  on public.community_poll_options (post_id, position);

create table if not exists public.community_poll_votes (
  post_id    uuid not null references public.community_posts (id) on delete cascade,
  option_id  uuid not null references public.community_poll_options (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.community_poll_options enable row level security;
alter table public.community_poll_votes  enable row level security;
grant select, insert, update, delete on public.community_poll_options to authenticated;
grant select, insert, update, delete on public.community_poll_votes  to authenticated;

-- Možnosti: čtou členové, zakládá/maže admin
drop policy if exists "klub cte moznosti" on public.community_poll_options;
create policy "klub cte moznosti" on public.community_poll_options
  for select to authenticated using (public.is_club_member());
drop policy if exists "admin moznosti" on public.community_poll_options;
create policy "admin moznosti" on public.community_poll_options
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Hlasy: čtou členové; každý hlasuje/mění/maže jen svůj hlas
drop policy if exists "klub cte hlasy" on public.community_poll_votes;
create policy "klub cte hlasy" on public.community_poll_votes
  for select to authenticated using (public.is_club_member());
drop policy if exists "klub hlasuje" on public.community_poll_votes;
create policy "klub hlasuje" on public.community_poll_votes
  for insert to authenticated with check (public.is_club_member() and user_id = auth.uid());
drop policy if exists "klub meni hlas" on public.community_poll_votes;
create policy "klub meni hlas" on public.community_poll_votes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "klub bere hlas" on public.community_poll_votes;
create policy "klub bere hlas" on public.community_poll_votes
  for delete to authenticated using (user_id = auth.uid());

-- ── 3) Anketu (poll) zakládá jen admin; ostatní kanály člen ─────────────────
drop policy if exists "klub pise prispevky" on public.community_posts;
create policy "klub pise prispevky" on public.community_posts
  for insert to authenticated
  with check (
    public.is_club_member() and author_id = auth.uid()
    and (channel <> 'poll' or public.is_admin())
  );

-- ── 4) Komentáře: v Q&A jen admin, v chatu/anketě/feedbacku i členové ───────
drop policy if exists "klub pise komentare" on public.community_comments;
create policy "klub pise komentare" on public.community_comments
  for insert to authenticated
  with check (
    public.is_club_member() and author_id = auth.uid()
    and exists (
      select 1 from public.community_posts p
      where p.id = post_id and (p.channel <> 'qa' or public.is_admin())
    )
  );

-- ── 5) Realtime ─────────────────────────────────────────────────────────────
do $$ begin alter publication supabase_realtime add table public.community_poll_options; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.community_poll_votes;  exception when others then null; end $$;
