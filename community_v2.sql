-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – VIP+ KLUB v2: identita autora + sekce Chat / Q&A
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
--  Předpoklad: community.sql už proběhl.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Denormalizovaná identita autora + kanál (chat/qa) ────────────────────
alter table public.community_posts
  add column if not exists author_name text,
  add column if not exists author_role text,
  add column if not exists channel text not null default 'chat';

do $$ begin
  alter table public.community_posts
    add constraint community_posts_channel_chk check (channel in ('chat', 'qa'));
exception when duplicate_object then null; end $$;

alter table public.community_comments
  add column if not exists author_name text,
  add column if not exists author_role text;

-- ── 2) Trigger: jméno + roli nastaví server (nelze podvrhnout) ──────────────
create or replace function public.community_set_author()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare nm text;
begin
  new.author_id := auth.uid();
  select coalesce(nullif(btrim(full_name), ''), split_part(email, '@', 1), 'Člen')
    into nm from public.profiles where id = auth.uid();
  new.author_name := coalesce(nm, 'Člen');
  new.author_role := case when public.is_admin() then 'lektor' else 'vip_plus' end;
  return new;
end;
$$;

drop trigger if exists set_author on public.community_posts;
create trigger set_author before insert on public.community_posts
  for each row execute function public.community_set_author();

drop trigger if exists set_author on public.community_comments;
create trigger set_author before insert on public.community_comments
  for each row execute function public.community_set_author();

-- ── 3) Doplnění identity u stávajících příspěvků/komentářů ──────────────────
update public.community_posts p set
  author_name = coalesce(nullif(btrim(pr.full_name), ''), split_part(pr.email, '@', 1), 'Člen'),
  author_role = case when pr.email = 'schroffelh@seznam.cz' then 'lektor' else 'vip_plus' end
from public.profiles pr
where pr.id = p.author_id and (p.author_name is null or p.author_role is null);

update public.community_comments c set
  author_name = coalesce(nullif(btrim(pr.full_name), ''), split_part(pr.email, '@', 1), 'Člen'),
  author_role = case when pr.email = 'schroffelh@seznam.cz' then 'lektor' else 'vip_plus' end
from public.profiles pr
where pr.id = c.author_id and (c.author_name is null or c.author_role is null);

-- ── 4) Q&A: odpovídat (komentovat) v kanálu 'qa' smí jen admin ──────────────
-- Otázky (příspěvky) může v qa zakládat každý člen; odpovědi jen lektor.
drop policy if exists "klub pise komentare" on public.community_comments;
create policy "klub pise komentare" on public.community_comments
  for insert to authenticated
  with check (
    public.is_club_member() and author_id = auth.uid()
    and exists (
      select 1 from public.community_posts p
      where p.id = post_id and (p.channel = 'chat' or public.is_admin())
    )
  );
