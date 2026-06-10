-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – BUDDIES v2: obrázky v chatu, nepřečtené, blokování
--  Spusť po buddies.sql. V SQL Editoru.
-- ════════════════════════════════════════════════════════════════════════════

-- Obrázky ve zprávách
alter table public.messages add column if not exists image_url text;

-- ── Nepřečtené (last_read na konverzaci) ────────────────────────────────────
create table if not exists public.dm_reads (
  user_id      uuid not null references auth.users(id) on delete cascade,
  friend_id    uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);
alter table public.dm_reads enable row level security;
grant select, insert, update on public.dm_reads to authenticated;
drop policy if exists "reads own" on public.dm_reads;
create policy "reads own" on public.dm_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.unread_by_buddy()
returns table (friend_id uuid, cnt int)
language sql stable security definer set search_path = public as $$
  select m.sender_id, count(*)::int
  from public.messages m
  left join public.dm_reads r on r.user_id = auth.uid() and r.friend_id = m.sender_id
  where m.recipient_id = auth.uid()
    and (r.last_read_at is null or m.created_at > r.last_read_at)
  group by m.sender_id;
$$;
grant execute on function public.unread_by_buddy() to authenticated;

create or replace function public.mark_dm_read(p_friend uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.dm_reads (user_id, friend_id, last_read_at)
  values (auth.uid(), p_friend, now())
  on conflict (user_id, friend_id) do update set last_read_at = now();
end; $$;
grant execute on function public.mark_dm_read(uuid) to authenticated;

-- ── Blokování ───────────────────────────────────────────────────────────────
create table if not exists public.blocked_users (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocked_users enable row level security;
grant select, insert, delete on public.blocked_users to authenticated;
drop policy if exists "blk own" on public.blocked_users;
create policy "blk own" on public.blocked_users for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- Žádost o přátelství respektuje blokaci
create or replace function public.send_buddy_request(p_to uuid)
returns text language plpgsql security definer set search_path = public as $$
begin
  if p_to = auth.uid() then return 'self'; end if;
  if exists (select 1 from public.blocked_users where (blocker_id=auth.uid() and blocked_id=p_to) or (blocker_id=p_to and blocked_id=auth.uid())) then return 'blocked'; end if;
  if exists (select 1 from public.friendships where (requester_id=auth.uid() and addressee_id=p_to) or (requester_id=p_to and addressee_id=auth.uid())) then return 'exists'; end if;
  insert into public.friendships (requester_id, addressee_id, status) values (auth.uid(), p_to, 'pending');
  return 'ok';
end; $$;
grant execute on function public.send_buddy_request(uuid) to authenticated;
