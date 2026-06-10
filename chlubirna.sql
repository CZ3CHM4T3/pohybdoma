-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – CHLUBÍRNA (nástěnka pokroku, MEMBER+). Spusť v SQL Editoru.
--  Předpoklad: profiles (membership.sql), is_admin (admin-policies.sql).
--  Obrázky: Storage bucket "community".
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.brags (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references auth.users(id) on delete cascade,
  author_name text,
  body        text default '',
  image_url   text,
  created_at  timestamptz not null default now()
);
alter table public.brags enable row level security;
grant select, insert, delete on public.brags to authenticated;

-- Číst i přispívat smí jen člen (ne FREE)
drop policy if exists "brags read members" on public.brags;
create policy "brags read members" on public.brags
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and tier <> 'free'));

drop policy if exists "brags insert members" on public.brags;
create policy "brags insert members" on public.brags
  for insert to authenticated
  with check (author_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and tier <> 'free'));

drop policy if exists "brags delete own" on public.brags;
create policy "brags delete own" on public.brags
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- Jméno autora (denormalizace)
create or replace function public.brag_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.author_name is null then
    select coalesce(full_name, split_part(email, '@', 1), 'Člen') into new.author_name from public.profiles where id = new.author_id;
  end if; return new;
end; $$;
drop trigger if exists brag_name_t on public.brags;
create trigger brag_name_t before insert on public.brags for each row execute function public.brag_name();

-- Povzbuzení (🙌) – jeden typ reakce
create table if not exists public.brag_cheers (
  brag_id uuid not null references public.brags(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (brag_id, user_id)
);
alter table public.brag_cheers enable row level security;
grant select, insert, delete on public.brag_cheers to authenticated;

drop policy if exists "cheers read members" on public.brag_cheers;
create policy "cheers read members" on public.brag_cheers
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and tier <> 'free'));

drop policy if exists "cheers insert own" on public.brag_cheers;
create policy "cheers insert own" on public.brag_cheers
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "cheers delete own" on public.brag_cheers;
create policy "cheers delete own" on public.brag_cheers
  for delete to authenticated using (user_id = auth.uid());
