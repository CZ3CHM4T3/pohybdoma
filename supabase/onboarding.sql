-- ============================================================
--  Onboarding průvodce (úvodní „babysitting" pro nového člena)
--  Kroky spravuje admin; člen je vidí jednou po přihlášení.
--  Spustit v Supabase → SQL Editor.
-- ============================================================

create table if not exists public.onboarding_steps (
  id         bigint generated always as identity primary key,
  position   int  not null default 0,
  title      text not null,
  body       text not null default '',
  image_url  text,
  cx         real not null default 50,   -- střed kroužku X v % obrázku
  cy         real not null default 50,   -- střed kroužku Y v %
  radius     real not null default 10,   -- poloměr kroužku v % šířky
  created_at timestamptz not null default now()
);
create index if not exists onboarding_steps_pos_idx on public.onboarding_steps (position);

alter table public.onboarding_steps enable row level security;

-- čtení: každý přihlášený (průvodce se ukazuje členům)
drop policy if exists "ob read" on public.onboarding_steps;
create policy "ob read" on public.onboarding_steps
  for select to authenticated using (true);

-- zápis: jen admin
drop policy if exists "ob admin write" on public.onboarding_steps;
create policy "ob admin write" on public.onboarding_steps
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.onboarding_steps to authenticated;

-- odkaz, kam vede tlačítko „Ukázat →" u kroku
alter table public.onboarding_steps add column if not exists href text;

-- ── Výchozí kroky průvodce (vloží se jen když je tabulka prázdná) ───────────
insert into public.onboarding_steps (position, title, body, href)
select v.position, v.title, v.body, v.href
from (values
  (1, 'Vítej v POHYB DOMA!',
      'Za minutku tě provedu tím nejdůležitějším – kde co najdeš a jak to funguje. Kdykoliv můžeš dát „Přeskočit".', null),
  (2, 'Knihovna pohybu',
      'Tady jsou všechna cvičební videa. Filtry (část těla, systém, délka, co máš doma…) ti pomůžou najít přesně to svoje. A když nevíš, do čeho se pustit, tlačítko „Náhodně" ti video vybere za tebe.', '/videoknihovna'),
  (3, 'Moje cesta – tvoje základna',
      'Tvůj účet má všechno pod jednou střechou: videa, kurzy, rezervace, stav členství, kruhy i deník. Odsud se dostaneš kamkoliv.', '/ucet'),
  (4, 'Můj deník',
      'Zapisuj si váhu, energii, spánek, bolest a trénink. V přehledném grafu pak uvidíš svůj posun černé na bílém – a že to funguje.', '/denik'),
  (5, 'Můj kalendář',
      'Plánuj si tréninky i poznámky. Vlastní barevné kategorie, čas a detaily u každé události – ať máš ve svém pohybu řád.', '/ucet'),
  (6, 'Komunita: Kruhy, Chlubírna a Buddies',
      'Najdi parťáky se stejným cílem, pochlub se pokrokem a piš si s nimi naživo. Společně to jde líp a vydrží to déle.', '/kruhy'),
  (7, 'Výzvy, žebříček a odznaky',
      'Každý měsíc krátká výzva pro radost. Za aktivitu sbíráš odznaky a posouváš se v žebříčku dříčů. Trocha hecu nikdy neuškodí. 💪', '/ucet'),
  (8, 'A teď hlavně začni',
      'Vyber si jedno video a pusť se do toho. Tvoje možnosti, tvoje cesta – a já jsem ti k ruce. — Honza', '/videoknihovna')
) as v(position, title, body, href)
where not exists (select 1 from public.onboarding_steps);
