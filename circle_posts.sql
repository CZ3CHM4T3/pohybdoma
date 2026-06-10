-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – diskuse v kruzích. Spusť v Supabase SQL Editoru.
--  Předpoklad: circles.sql (is_circle_member), admin-policies.sql (is_admin),
--  membership.sql (profiles.full_name/email). Bucket "community" pro obrázky.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.circle_posts (
  id          uuid primary key default gen_random_uuid(),
  circle_id   uuid not null references public.circles(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  author_name text,
  body        text default '',
  image_url   text,
  created_at  timestamptz not null default now()
);

alter table public.circle_posts enable row level security;
grant select, insert, delete on public.circle_posts to authenticated;

-- Číst jen členové daného kruhu
drop policy if exists "circle_posts read members" on public.circle_posts;
create policy "circle_posts read members" on public.circle_posts
  for select to authenticated using (public.is_circle_member(circle_id));

-- Psát jen členové, jako sebe
drop policy if exists "circle_posts insert members" on public.circle_posts;
create policy "circle_posts insert members" on public.circle_posts
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_circle_member(circle_id));

-- Mazat své příspěvky (admin cokoliv)
drop policy if exists "circle_posts delete own" on public.circle_posts;
create policy "circle_posts delete own" on public.circle_posts
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- Denormalizace jména autora (aby šlo zobrazit bez čtení cizích profilů)
create or replace function public.circle_post_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.author_name is null then
    select coalesce(full_name, split_part(email, '@', 1), 'Člen')
      into new.author_name from public.profiles where id = new.author_id;
  end if;
  return new;
end $$;

drop trigger if exists circle_post_name_t on public.circle_posts;
create trigger circle_post_name_t before insert on public.circle_posts
  for each row execute function public.circle_post_name();
