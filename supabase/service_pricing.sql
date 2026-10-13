-- ════════════════════════════════════════════════════════════════════════════
--  CENÍK SLUŽEB + INDIVIDUÁLNÍ CENY (slevy) + značka služby u lekcí
--   • service_catalog       = co nabízím a za kolik (výchozí ceny)
--   • client_service_price  = individuální cena konkrétního člověka (sleva)
--   • lesson_plans.service_key / recurring_lessons.service_key = jaká služba to byla
--  Ceny ve fakturaci: individuální cena → ceník → (fallback) cena u lekce/bloku.
--  Předpoklad: public.is_admin(). Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Ceník služeb ────────────────────────────────────────────────────────────
create table if not exists public.service_catalog (
  key        text primary key,            -- fitness, masaz, kruhac, tenis, msgem, skolka, krouzek, jine
  label      text not null,               -- název na faktuře
  unit       text not null default 'lekce',   -- jednotka: lekce | měsíc | masáž
  intro_term text,                         -- výraz do úvodní věty (fitness tréninky…)
  price      integer not null default 0,   -- výchozí cena (0 = ber cenu z lekce/bloku)
  bill_mode  text not null default 'per_lesson', -- per_lesson | monthly
  active     boolean not null default true,
  position   int not null default 0
);

insert into public.service_catalog (key, label, unit, intro_term, price, bill_mode, position) values
  ('fitness', 'Fitness trénink',        'lekce', 'fitness tréninky',  900, 'per_lesson', 1),
  ('masaz',   'Sportovní masáž',        'masáž', 'sportovní masáže',  600, 'per_lesson', 2),
  ('kruhac',  'Kruhový trénink',        'měsíc', 'kruhové tréninky',  250, 'monthly',    3),
  ('tenis',   'Příprava tenistů',       'lekce', 'skupinové tréninky',200, 'per_lesson', 4),
  ('msgem',   'MS GEM',                 'lekce', 'skupinové tréninky',  0, 'per_lesson', 5),
  ('skolka',  'Tenis s EMESKOU (MŠ)',   'lekce', 'skupinové tréninky',  0, 'per_lesson', 6),
  ('krouzek', 'Kroužek',                'lekce', 'skupinové tréninky',  0, 'per_lesson', 7),
  ('jine',    'Jiné',                   'lekce', 'služby',              0, 'per_lesson', 8)
on conflict (key) do nothing;

alter table public.service_catalog enable row level security;
drop policy if exists "admin service catalog" on public.service_catalog;
create policy "admin service catalog" on public.service_catalog
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Individuální ceny klientů (slevy) ───────────────────────────────────────
create table if not exists public.client_service_price (
  client_name text not null,     -- jméno člověka (ne fakturační skupina)
  service_key text not null,
  price       integer not null,
  primary key (client_name, service_key)
);
alter table public.client_service_price enable row level security;
drop policy if exists "admin client prices" on public.client_service_price;
create policy "admin client prices" on public.client_service_price
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Značka služby u jednotlivých lekcí ──────────────────────────────────────
alter table public.lesson_plans      add column if not exists service_key text;
alter table public.recurring_lessons add column if not exists service_key text;
