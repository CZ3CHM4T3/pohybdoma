-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – KRUHY (komunitní skupiny)
--  Zakládá: jen VIP+ (nebo admin). Připojí se: MEMBER+ (ne FREE).
--  Jména členů vidíš až po přidání. Spusť v Supabase SQL Editoru.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.circles (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  description  text,
  created_by   uuid references public.profiles (id) on delete set null,
  member_count int not null default 0,
  created_at   timestamptz not null default now()
);

create table if not exists public.circle_members (
  circle_id    uuid not null references public.circles (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  display_name text,
  joined_at    timestamptz not null default now(),
  primary key (circle_id, user_id)
);
alter table public.circle_members add column if not exists display_name text;

alter table public.circles        enable row level security;
alter table public.circle_members enable row level security;
grant select on public.circles to anon, authenticated;
grant insert, update, delete on public.circles to authenticated;
grant select, insert, delete on public.circle_members to authenticated;

-- Pomocná funkce (bez RLS rekurze): je přihlášený členem daného kruhu?
create or replace function public.is_circle_member(cid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.circle_members where circle_id = cid and user_id = auth.uid()
  );
$$;

-- ── Kruhy: čte kdokoliv; zakládá jen VIP+ / admin; spravuje zakladatel/admin ─
drop policy if exists "circles read" on public.circles;
create policy "circles read" on public.circles for select to anon, authenticated using (true);

drop policy if exists "circles create" on public.circles;
create policy "circles create" on public.circles for insert to authenticated
  with check (
    created_by = auth.uid()
    and (public.is_admin() or exists (
      select 1 from public.profiles where id = auth.uid() and tier = 'vip_plus'
    ))
  );

drop policy if exists "circles update" on public.circles;
create policy "circles update" on public.circles for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

drop policy if exists "circles delete" on public.circles;
create policy "circles delete" on public.circles for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- ── Členové: vidíš je jen když jsi členem kruhu (nebo admin) ─────────────────
drop policy if exists "members read" on public.circle_members;
create policy "members read" on public.circle_members for select to authenticated
  using (public.is_admin() or public.is_circle_member(circle_id));

-- Připojit se smí MEMBER+ (ne FREE), jen sám sebe
drop policy if exists "members join" on public.circle_members;
create policy "members join" on public.circle_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and tier <> 'free')
  );

-- Odejít smí každý ze svého členství
drop policy if exists "members leave" on public.circle_members;
create policy "members leave" on public.circle_members for delete to authenticated
  using (user_id = auth.uid());

-- ── Jméno člena (denormalizované, aby šlo zobrazit i přes RLS profilů) ──────
create or replace function public.circle_member_name()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  select coalesce(nullif(btrim(full_name), ''), split_part(email, '@', 1), 'Člen')
    into new.display_name from public.profiles where id = new.user_id;
  return new;
end;
$$;
drop trigger if exists set_member_name on public.circle_members;
create trigger set_member_name before insert on public.circle_members
  for each row execute function public.circle_member_name();

-- ── Počet členů: udržuje trigger ────────────────────────────────────────────
create or replace function public.circle_count_sync()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.circles set member_count = member_count + 1 where id = new.circle_id;
  elsif (tg_op = 'DELETE') then
    update public.circles set member_count = greatest(0, member_count - 1) where id = old.circle_id;
  end if;
  return null;
end;
$$;
drop trigger if exists circle_count on public.circle_members;
create trigger circle_count after insert or delete on public.circle_members
  for each row execute function public.circle_count_sync();

-- ── Pár startovních kruhů ────────────────────────────────────────────────────
insert into public.circles (slug, name, description)
select * from (values
  ('40plus', '40+', 'Pohyb a zdraví po čtyřicítce.'),
  ('maminky', 'Maminky', 'Cvičení kolem mateřství a po porodu.'),
  ('teniste', 'Tenisté', 'Prevence a výkon pro tenis.'),
  ('seniori', 'Senioři', 'Mobilita a síla ve vyšším věku.'),
  ('zacatecnici', 'Začátečníci', 'První kroky k pravidelnému pohybu.'),
  ('bolava-zada', 'Bolavá záda', 'Společně proti ztuhlým zádům.'),
  ('kancelar', 'Kancelář', 'Pro sedavé zaměstnání.'),
  ('kalistenika', 'Kalistenika', 'Cvičení s vlastní vahou.')
) as v(slug, name, description)
where not exists (select 1 from public.circles c where c.slug = v.slug);
