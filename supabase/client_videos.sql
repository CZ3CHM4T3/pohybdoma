-- ════════════════════════════════════════════════════════════════════════════
--  OSOBNÍ VIDEOKNIHOVNA KLIENTA (videa natočená přímo pro konkrétního klienta)
--  Nahrává admin z mobilu → ukládá se na Cloudflare Stream (cf_uid), v DB jen
--  odkaz + název. Klient vidí JEN svoje videa ve svém profilu / klubu.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Propojení karty klienta s účtem (aby přihlášený klient věděl, čí videa jsou).
--    Nepovinné – doplní se buď přes QR pozvánku, nebo se spáruje podle e-mailu.
alter table public.clients
  add column if not exists user_id uuid references auth.users (id) on delete set null;

-- 2) Tabulka osobních videí.
create table if not exists public.client_videos (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients (id) on delete cascade,
  cf_uid     text not null,                -- UID videa v Cloudflare Stream
  title      text,
  note       text,
  source     text not null default 'admin',-- 'admin' = natočil Honza, 'client' = nahrál si klient sám
  created_at timestamptz not null default now()
);

-- Doplnění sloupce i do už existující tabulky (bezpečné i opakovaně).
alter table public.client_videos
  add column if not exists source text not null default 'admin';

create index if not exists client_videos_client_idx on public.client_videos (client_id, created_at desc);

alter table public.client_videos enable row level security;
grant select, insert, update, delete on public.client_videos to authenticated;

-- 3) Admin může všechno.
drop policy if exists "admin client_videos" on public.client_videos;
create policy "admin client_videos" on public.client_videos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 4) Klient smí ČÍST jen videa své vlastní karty (párování přes user_id nebo e-mail).
drop policy if exists "klient cte svoje videa" on public.client_videos;
create policy "klient cte svoje videa" on public.client_videos
  for select to authenticated using (
    exists (
      select 1 from public.clients c
      where c.id = client_videos.client_id
        and (
          c.user_id = auth.uid()
          or lower(coalesce(c.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
  );
