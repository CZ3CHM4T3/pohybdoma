-- Produkty (editovatelné z adminu → záložka Produkty)
-- Bezpečné pustit opakovaně.

create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  slug        text,                       -- odkaz na detail (např. "pohybovy-audit"); prázdné = bez detailu
  name        text not null,
  tagline     text default '',            -- krátký podtitulek
  description text default '',            -- popis
  price       text default '',            -- volný text, např. "od 2 900 Kč" (prázdné = "Brzy")
  accent      text default 'blue',        -- barva dlaždice: blue | violet | amber | emerald | rose
  published   boolean not null default false,  -- zobrazit na /produkty
  position    integer not null default 0,      -- pořadí (menší = dřív)
  created_at  timestamptz not null default now()
);

alter table public.products enable row level security;

-- Admin má plná práva
drop policy if exists "admin spravuje produkty" on public.products;
create policy "admin spravuje produkty" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- Veřejnost čte jen zveřejněné
drop policy if exists "verejnost cte zverejnene produkty" on public.products;
create policy "verejnost cte zverejnene produkty" on public.products
  for select using (published = true);

-- Seed: přenos stávajících napevno zapsaných produktů (jen když je tabulka prázdná)
insert into public.products (slug, name, tagline, description, price, accent, published, position)
select * from (values
  ('pohybovy-audit', 'Pohybový audit', 'Najdi příčinu, ne jen symptom',
   'Komplexní pohybová diagnostika, osobní plán na měsíc a kontrola výsledků. Podíváme se na tělo jako celek – dech, postura, pohybové vzory.',
   'od 2 900 Kč', 'blue', true, 0),
  (null, 'Pohybový plán na míru', 'Připravujeme',
   'Dlouhodobé vedení a plán šitý na tvoje tělo a cíle.',
   '', 'violet', false, 1),
  (null, 'Další produkty', 'Připravujeme',
   'Postupně přibydou další nástroje a balíčky.',
   '', 'amber', false, 2)
) as v(slug, name, tagline, description, price, accent, published, position)
where not exists (select 1 from public.products);
