-- ════════════════════════════════════════════════════════════════════════════
--  Kartotéka klientů (seznam stálých klientů). U každého lze v Rozvrhu nastavit
--  opakovanou lekci (recurring_lessons). E-mail je nepovinný – když ho vyplníš
--  a klient má účet, může se sám omluvit.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně (jména se nezdvojí).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;
grant select, insert, update, delete on public.clients to authenticated;

drop policy if exists "admin clients" on public.clients;
create policy "admin clients" on public.clients
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Předvyplnění seznamu (přidá jen jména, která ještě nejsou).
insert into public.clients (name)
select v.name from (values
  ('Dita Ptáčková'),
  ('Kamila Mimrová'),
  ('Martina Kořánová'),
  ('Johana Tůmová'),
  ('Markéta Krčová'),
  ('Milena Matoušová'),
  ('Žaneta Kremsa'),
  ('Karolína Nováková'),
  ('Veronika Horejšová'),
  ('Veronika Šamonilová'),
  ('Andrea Svitáková'),
  ('Vlado Gašpar'),
  ('Jana Tajtlová'),
  ('Jitka Měsťáková'),
  ('Petr Pavelek')
) as v(name)
where not exists (select 1 from public.clients c where c.name = v.name);
