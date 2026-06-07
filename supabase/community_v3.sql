-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – VIP+ KLUB v3: vnořené odpovědi + limit 2 topicy/týden v chatu
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
--  Předpoklad: community.sql + community_v2.sql.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Vnořené odpovědi: komentář může mít rodiče (jiný komentář) ───────────
alter table public.community_comments
  add column if not exists parent_id uuid
    references public.community_comments (id) on delete cascade;

create index if not exists community_comments_parent_idx
  on public.community_comments (parent_id);

-- ── 2) Spam kontrola: člen smí v chatu založit max 2 topicy za 7 dní ────────
-- (admin/lektor neomezen; Q&A se netýká)
create or replace function public.community_chat_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.channel = 'chat' and not public.is_admin() then
    if (
      select count(*) from public.community_posts
      where author_id = auth.uid()
        and channel = 'chat'
        and created_at > now() - interval '7 days'
    ) >= 2 then
      raise exception 'TOPIC_LIMIT' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists chat_limit on public.community_posts;
create trigger chat_limit before insert on public.community_posts
  for each row execute function public.community_chat_limit();
