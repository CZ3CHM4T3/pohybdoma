-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – PARŤÁCI (přátelé) + soukromý 1:1 chat. Spusť v SQL Editoru.
--  Předpoklad: profiles (membership.sql: full_name, email).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Přátelství ──────────────────────────────────────────────────────────────
create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending',  -- pending | accepted
  created_at   timestamptz not null default now(),
  unique (requester_id, addressee_id)
);
alter table public.friendships enable row level security;
grant select, insert, update, delete on public.friendships to authenticated;

drop policy if exists "fr read" on public.friendships;
create policy "fr read" on public.friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
drop policy if exists "fr insert" on public.friendships;
create policy "fr insert" on public.friendships for insert to authenticated
  with check (requester_id = auth.uid());
drop policy if exists "fr accept" on public.friendships;
create policy "fr accept" on public.friendships for update to authenticated
  using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());
drop policy if exists "fr delete" on public.friendships;
create policy "fr delete" on public.friendships for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ── Zprávy ──────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body         text not null,
  created_at   timestamptz not null default now()
);
alter table public.messages enable row level security;
grant select, insert on public.messages to authenticated;

drop policy if exists "msg read" on public.messages;
create policy "msg read" on public.messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists "msg send" on public.messages;
create policy "msg send" on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = auth.uid() and f.addressee_id = recipient_id)
          or (f.addressee_id = auth.uid() and f.requester_id = recipient_id))
    )
  );

-- ── Pomocné funkce (kvůli jménům přes RLS profilů) ──────────────────────────
create or replace function public.find_user_by_email(p_email text)
returns table (id uuid, name text)
language sql stable security definer set search_path = public, auth as $$
  select u.id, coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1), 'Člen')
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(u.email) = lower(btrim(p_email)) and u.id <> auth.uid()
  limit 1;
$$;
grant execute on function public.find_user_by_email(text) to authenticated;

create or replace function public.my_buddies()
returns table (friendship_id uuid, friend_id uuid, name text, status text, direction text)
language sql stable security definer set search_path = public, auth as $$
  select
    f.id,
    case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end,
    coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1), 'Člen'),
    f.status,
    case when f.requester_id = auth.uid() then 'out' else 'in' end
  from public.friendships f
  join auth.users u
    on u.id = (case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end)
  left join public.profiles p on p.id = u.id
  where f.requester_id = auth.uid() or f.addressee_id = auth.uid()
  order by f.created_at desc;
$$;
grant execute on function public.my_buddies() to authenticated;

create or replace function public.send_buddy_request(p_to uuid)
returns text
language plpgsql security definer set search_path = public as $$
begin
  if p_to = auth.uid() then return 'self'; end if;
  if exists (
    select 1 from public.friendships
    where (requester_id = auth.uid() and addressee_id = p_to)
       or (requester_id = p_to and addressee_id = auth.uid())
  ) then return 'exists'; end if;
  insert into public.friendships (requester_id, addressee_id, status)
  values (auth.uid(), p_to, 'pending');
  return 'ok';
end;
$$;
grant execute on function public.send_buddy_request(uuid) to authenticated;

-- ── Realtime pro zprávy ─────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
