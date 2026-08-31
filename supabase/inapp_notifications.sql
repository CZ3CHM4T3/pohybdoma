-- ════════════════════════════════════════════════════════════════════════════
--  IN-APP UPOZORNĚNÍ („bublina" / zvoneček v appce).
--  Klient se omluví → uvidí to Honza; lektor zruší/přesune → uvidí to klient.
--  Zápis dělají SECURITY DEFINER funkce (z triggerů) → obchází RLS.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.app_notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null,
  body       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists app_notifications_user_idx on public.app_notifications (user_id, read, created_at desc);

alter table public.app_notifications enable row level security;

drop policy if exists "uzivatel cte sve notifikace" on public.app_notifications;
create policy "uzivatel cte sve notifikace" on public.app_notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "uzivatel upravuje sve notifikace" on public.app_notifications;
create policy "uzivatel upravuje sve notifikace" on public.app_notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, update on public.app_notifications to authenticated;

-- UID lektora (admina) podle e-mailu
create or replace function public.admin_uid()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where email = 'schroffelh@seznam.cz' limit 1;
$$;

-- Zápis notifikace (nesmí shodit vyvolávající akci)
create or replace function public.pd_notify(p_user uuid, p_title text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into public.app_notifications (user_id, title, body) values (p_user, p_title, p_body);
exception when others then null;
end;
$$;

grant execute on function public.admin_uid() to authenticated;
grant execute on function public.pd_notify(uuid, text, text) to authenticated;

-- Živé aktualizace zvonečku
do $$ begin
  alter publication supabase_realtime add table public.app_notifications;
exception when duplicate_object then null; when others then null; end $$;
