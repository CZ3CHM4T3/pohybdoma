-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – RECENZE (spravované z adminu, časem i návrhy od členů)
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete set null,
  author_name text not null,
  place       text,
  rating      smallint not null check (rating between 1 and 5),
  text        text not null,
  approved    boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.reviews enable row level security;
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;

-- Veřejně se zobrazují jen schválené recenze
drop policy if exists "recenze verejne cteni" on public.reviews;
create policy "recenze verejne cteni" on public.reviews
  for select to anon, authenticated using (approved = true);

-- Admin vidí a spravuje vše
drop policy if exists "recenze admin sprava" on public.reviews;
create policy "recenze admin sprava" on public.reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Člen s úrovní (ne FREE) může navrhnout recenzi – čeká na schválení adminem
drop policy if exists "recenze clen navrhuje" on public.reviews;
create policy "recenze clen navrhuje" on public.reviews
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and approved = false
    and exists (select 1 from public.profiles where id = auth.uid() and tier <> 'free')
  );

-- Seed: první reálná recenze (Veronika) – jen pokud tam ještě není
insert into public.reviews (author_name, rating, text, approved)
select
  'Veronika Š.', 5,
  'Honzu mít jako svého trenéra, to je absolutní must-have, pokud vám záleží na svém těle a chcete se cítit dobře. Ne, není to jako posilování ve fitku nebo pilates, ale Honzu potřebujete k tomu, aby vás tělo podrželo a nic vás nebolelo. Pokud bychom mohli doma dát hvězdičky, tak jednoznačně 10 z 10!',
  true
where not exists (select 1 from public.reviews where author_name = 'Veronika Š.');
