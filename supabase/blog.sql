-- ============================================================
--  Blog – články (píše a formátuje admin).
--  Spustit v Supabase → SQL Editor.
-- ============================================================

create table if not exists public.blog_posts (
  id         bigint generated always as identity primary key,
  slug       text not null unique,
  title      text not null,
  content    text not null default '',
  cover_url  text,
  published  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blog_posts_pub_idx on public.blog_posts (published, created_at desc);

alter table public.blog_posts enable row level security;

-- čtení: publikované vidí každý; admin vidí i nepublikované
drop policy if exists "blog read" on public.blog_posts;
create policy "blog read" on public.blog_posts
  for select to anon, authenticated using (published = true or public.is_admin());

-- zápis: jen admin
drop policy if exists "blog admin write" on public.blog_posts;
create policy "blog admin write" on public.blog_posts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.blog_posts to anon;
grant select, insert, update, delete on public.blog_posts to authenticated;
