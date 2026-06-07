-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – VIP+ KOMUNITA (komunitní zeď)
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
--  Předpoklad: schema.sql + admin-policies.sql + membership.sql (profiles, is_admin()).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Kdo má přístup do klubu: VIP+ nebo admin ────────────────────────────────
create or replace function public.is_club_member()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.profiles
    where id = auth.uid() and tier = 'vip_plus'
  );
$$;

-- ── Příspěvky ───────────────────────────────────────────────────────────────
create table if not exists public.community_posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null,
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists community_posts_created_idx
  on public.community_posts (pinned desc, created_at desc);

-- ── Komentáře ───────────────────────────────────────────────────────────────
create table if not exists public.community_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists community_comments_post_idx
  on public.community_comments (post_id, created_at);

-- ── Reakce (emoji) ──────────────────────────────────────────────────────────
create table if not exists public.community_reactions (
  post_id    uuid not null references public.community_posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);

-- ── Zabezpečení (RLS) ───────────────────────────────────────────────────────
alter table public.community_posts      enable row level security;
alter table public.community_comments   enable row level security;
alter table public.community_reactions  enable row level security;

grant select, insert, update, delete on public.community_posts     to authenticated;
grant select, insert, update, delete on public.community_comments  to authenticated;
grant select, insert, update, delete on public.community_reactions to authenticated;

-- Příspěvky: čtou členové klubu; psát smí člen sám za sebe;
-- mazat smí autor nebo admin; připínat (update) jen admin.
drop policy if exists "klub cte prispevky" on public.community_posts;
create policy "klub cte prispevky" on public.community_posts
  for select to authenticated using (public.is_club_member());

drop policy if exists "klub pise prispevky" on public.community_posts;
create policy "klub pise prispevky" on public.community_posts
  for insert to authenticated
  with check (public.is_club_member() and author_id = auth.uid());

drop policy if exists "klub maze prispevky" on public.community_posts;
create policy "klub maze prispevky" on public.community_posts
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

drop policy if exists "klub pripina prispevky" on public.community_posts;
create policy "klub pripina prispevky" on public.community_posts
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Komentáře
drop policy if exists "klub cte komentare" on public.community_comments;
create policy "klub cte komentare" on public.community_comments
  for select to authenticated using (public.is_club_member());

drop policy if exists "klub pise komentare" on public.community_comments;
create policy "klub pise komentare" on public.community_comments
  for insert to authenticated
  with check (public.is_club_member() and author_id = auth.uid());

drop policy if exists "klub maze komentare" on public.community_comments;
create policy "klub maze komentare" on public.community_comments
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- Reakce
drop policy if exists "klub cte reakce" on public.community_reactions;
create policy "klub cte reakce" on public.community_reactions
  for select to authenticated using (public.is_club_member());

drop policy if exists "klub pridava reakce" on public.community_reactions;
create policy "klub pridava reakce" on public.community_reactions
  for insert to authenticated
  with check (public.is_club_member() and user_id = auth.uid());

drop policy if exists "klub bere reakce" on public.community_reactions;
create policy "klub bere reakce" on public.community_reactions
  for delete to authenticated using (user_id = auth.uid());

-- ── Realtime (živé aktualizace) ─────────────────────────────────────────────
do $$ begin alter publication supabase_realtime add table public.community_posts;     exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.community_comments;  exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.community_reactions; exception when others then null; end $$;
