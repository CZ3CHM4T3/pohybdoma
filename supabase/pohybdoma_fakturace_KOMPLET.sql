-- ════════════════════════════════════════════════════════════════════════════
--  KOMPLETNÍ FAKTURACE PRO POHYB DOMA — spustit NA SPRÁVNÉM projektu:
--  elavgxuequqnptbjswqn  (https://supabase.com/dashboard/project/elavgxuequqnptbjswqn/sql/new)
--  Jeden skript = všech 6 částí ve správném pořadí. Nic nemaže, lze pustit i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════


-- ========================= invoicing.sql =========================

-- ════════════════════════════════════════════════════════════════════════════
--  FAKTURACE PŘES POHYB DOMA
--   • invoice_config   = moje údaje živnostníka, účet/IBAN, splatnost, číselník
--   • billing_profiles = fakturační údaje + e-mail klienta/plátce
--   • invoices         = vystavené faktury (snapshot, neměnné), veřejné přes token
--   • next_invoice_number() = atomické přidělení dalšího čísla (bez duplicit)
--   • get_invoice(token)    = veřejné čtení jedné faktury přes tajný odkaz
--  Předpoklad: public.is_admin(). Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Nastavení fakturace (jeden řádek) ───────────────────────────────────────
create table if not exists public.invoice_config (
  id               int primary key default 1,
  business_name    text,
  business_address text,
  business_ico     text,
  business_dic     text,
  iban             text,
  account_display  text,
  due_days         int not null default 14,
  vat_payer        boolean not null default false,
  next_number      bigint not null default 1,
  footer_note      text,
  intro_note       text,   -- úvodní věta na faktuře, {mesic} = název měsíce
  constraint invoice_config_singleton check (id = 1)
);
-- Kdyby tabulka už existovala bez nových sloupců:
alter table public.invoice_config add column if not exists intro_note text;

insert into public.invoice_config
  (id, business_name, business_address, business_ico, iban, account_display, due_days, vat_payer, next_number, footer_note, intro_note)
values
  (1, 'Mgr. Jan Schröffel', 'Chovatelů 159, Hradištko, 252 09', '04531817',
   'CZ4130300000003470043017', '3470043017/3030', 7, false, 20260163,
   'Nejsem plátce DPH.', 'Dobrý den, fakturuji Vám za {sluzby} poskytnuté v období {mesic}:')
on conflict (id) do nothing;
-- Když řádek už existoval a větu nemá, doplň výchozí:
update public.invoice_config
  set intro_note = 'Dobrý den, fakturuji Vám za {sluzby} poskytnuté v období {mesic}:'
  where id = 1 and (intro_note is null or intro_note = '');

alter table public.invoice_config enable row level security;
drop policy if exists "admin invoice config" on public.invoice_config;
create policy "admin invoice config" on public.invoice_config
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Fakturační údaje klienta/plátce (klíč = jméno plátce) ───────────────────
create table if not exists public.billing_profiles (
  name       text primary key,   -- jméno plátce (skupina ve Fakturách)
  bill_name  text,               -- jméno/název na faktuře (prázdné = name)
  address    text,
  ico        text,
  email      text,
  created_at timestamptz not null default now()
);
alter table public.billing_profiles enable row level security;
drop policy if exists "admin billing profiles" on public.billing_profiles;
create policy "admin billing profiles" on public.billing_profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Vystavené faktury (snapshot – po vystavení se nemění) ────────────────────
create table if not exists public.invoices (
  id         uuid primary key default gen_random_uuid(),
  number     bigint unique not null,
  token      text unique not null,
  payer_name text not null,
  bill_name  text,
  address    text,
  ico        text,
  email      text,
  month      text not null,                 -- "YYYY-MM"
  issued_on  date not null default (now() at time zone 'Europe/Prague')::date,
  due_on     date not null,
  amount     integer not null,
  vs         text not null,
  intro      text,                            -- úvodní věta (snapshot v době vystavení)
  lines      jsonb not null default '[]'::jsonb,
  status     text not null default 'issued', -- issued | sent | paid
  sent_at    timestamptz,
  paid_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table public.invoices add column if not exists intro text;
create index if not exists invoices_month_idx on public.invoices (month);
create index if not exists invoices_payer_month_idx on public.invoices (payer_name, month);

alter table public.invoices enable row level security;
drop policy if exists "admin invoices" on public.invoices;
create policy "admin invoices" on public.invoices
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Atomické přidělení dalšího čísla faktury ────────────────────────────────
create or replace function public.next_invoice_number()
returns bigint language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  if not public.is_admin() then raise exception 'jen admin'; end if;
  update public.invoice_config set next_number = next_number + 1 where id = 1
    returning next_number - 1 into n;   -- vrátí číslo PŘED navýšením (to právě použité)
  return n;
end; $$;
grant execute on function public.next_invoice_number() to authenticated;

-- ── Veřejné čtení jedné faktury přes tajný token (bez přihlášení) ────────────
drop function if exists public.get_invoice(text);
create or replace function public.get_invoice(p_token text)
returns table (
  number bigint, payer_name text, bill_name text, address text, ico text,
  month text, issued_on date, due_on date, amount integer, vs text,
  intro text, lines jsonb, status text
) language sql security definer set search_path = public stable as $$
  select i.number, i.payer_name, i.bill_name, i.address, i.ico, i.month,
         i.issued_on, i.due_on, i.amount, i.vs, i.intro, i.lines, i.status
  from public.invoices i where i.token = p_token;
$$;
grant execute on function public.get_invoice(text) to anon, authenticated;

-- ── Odeslání e-mailu s fakturou (jen admin) ─────────────────────────────────
-- Tenký obal nad pd_send_email s kontrolou admina, aby rozesílání nešlo zneužít.
create or replace function public.admin_send_email(p_to text, p_subject text, p_html text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'jen admin'; end if;
  return public.pd_send_email(p_to, p_subject, p_html);
end; $$;
revoke all on function public.admin_send_email(text, text, text) from public;
grant execute on function public.admin_send_email(text, text, text) to authenticated;

-- ========================= invoice_extras.sql =========================

-- ════════════════════════════════════════════════════════════════════════════
--  MIMOŘÁDNÉ POLOŽKY NA FAKTUŘE (extra k danému člověku a měsíci).
--  Např. hodina/služba, co nebyla v kalendáři, nebo člověk jen tento měsíc.
--  Přičte se k jeho vyúčtování za daný měsíc.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.invoice_extras (
  id         uuid primary key default gen_random_uuid(),
  month      text not null,            -- "YYYY-MM"
  client     text not null,            -- komu (jméno; může být i nový člověk)
  label      text not null,            -- název položky
  amount_kc  integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists invoice_extras_month_idx on public.invoice_extras (month);

alter table public.invoice_extras enable row level security;
drop policy if exists "admin invoice extras" on public.invoice_extras;
create policy "admin invoice extras" on public.invoice_extras
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ========================= service_pricing.sql =========================

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
  price      integer not null default 0,   -- cena ZA LEKCI (0 = ber cenu z lekce/bloku)
  bill_mode  text not null default 'per_lesson', -- per_lesson = za každou lekci | monthly = když přišel ≥1×, platí všechny lekce v měsíci
  active     boolean not null default true,
  position   int not null default 0
);

insert into public.service_catalog (key, label, unit, intro_term, price, bill_mode, position) values
  ('fitness', 'Fitness trénink',        'lekce', 'fitness tréninky',  900, 'per_lesson', 1),
  ('masaz',   'Sportovní masáž',        'masáž', 'sportovní masáže',  600, 'per_lesson', 2),
  ('kruhac',  'Kruhový trénink',        'lekce', 'kruhové tréninky',  250, 'monthly',    3),
  ('tenis',   'Příprava tenistů',       'lekce', 'skupinové tréninky',200, 'monthly',    4),
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

-- ========================= service_price_history.sql =========================

-- ════════════════════════════════════════════════════════════════════════════
--  ZMĚNY CENY V ČASE (ceník).
--  Když se změní cena služby (např. PPT po přechodu do haly), nastaví se nová
--  cena OD data. Lekce před tím datem se počítají starou cenou, od data novou.
--  Cena pro konkrétní lekci = poslední změna s from_date <= datum lekce,
--  jinak základní cena v service_catalog.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.service_price_history (
  service_key text not null,
  from_date   date not null,
  price       integer not null,
  primary key (service_key, from_date)
);
alter table public.service_price_history enable row level security;
drop policy if exists "admin price history" on public.service_price_history;
create policy "admin price history" on public.service_price_history
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ========================= recurring_since.sql =========================

-- ════════════════════════════════════════════════════════════════════════════
--  Pravidelná lekce: od kdy se počítá do faktur (since).
--  Prázdné = počítá se od globálního začátku (1. 9. 2026). Vyplněné datum =
--  počítá se až od něj (aby nová lekce nezpětně naúčtovala celý měsíc).
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.recurring_lessons add column if not exists since date;

-- ========================= invoicing_v2.sql =========================

-- ════════════════════════════════════════════════════════════════════════════
--  FAKTURACE – doplňky v2
--   • billing_profiles.dic            = DIČ plátce (nepovinné)
--   • billing_profiles.monthly_fixed  = pevný měsíční plátce (Jiří) – ukáže se vždy
--   • billing_profiles.fixed_label    = výchozí popis položky pevné faktury
--   • invoices.dic                    = DIČ (snapshot)
--   • invoice_skip                    = koho daný měsíc NEfakturovat (vyřadit z hromady)
--   • seed Jiří Machek jako pevný měsíční plátce
--  NEMAŽE žádná data. Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.billing_profiles add column if not exists dic text;
alter table public.billing_profiles add column if not exists monthly_fixed boolean not null default false;
alter table public.billing_profiles add column if not exists fixed_label text;

alter table public.invoices add column if not exists dic text;

-- Jiří Machek – kolega, fakturuje se mu každý měsíc za společné tenisové hodiny.
insert into public.billing_profiles (name, monthly_fixed, fixed_label)
values ('Jiří Machek', true, 'Tenisové hodiny (MS GEM + MŠ)')
on conflict (name) do update
  set monthly_fixed = true,
      fixed_label = coalesce(public.billing_profiles.fixed_label, excluded.fixed_label);

-- Vyřazení plátce z fakturace v daném měsíci (nebyl / nefakturovat)
create table if not exists public.invoice_skip (
  month      text not null,   -- "YYYY-MM"
  payer_name text not null,
  primary key (month, payer_name)
);
alter table public.invoice_skip enable row level security;
drop policy if exists "admin invoice skip" on public.invoice_skip;
create policy "admin invoice skip" on public.invoice_skip
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- get_invoice vrací i DIČ
drop function if exists public.get_invoice(text);
create or replace function public.get_invoice(p_token text)
returns table (
  number bigint, payer_name text, bill_name text, address text, ico text, dic text,
  month text, issued_on date, due_on date, amount integer, vs text,
  intro text, lines jsonb, status text
) language sql security definer set search_path = public stable as $$
  select i.number, i.payer_name, i.bill_name, i.address, i.ico, i.dic, i.month,
         i.issued_on, i.due_on, i.amount, i.vs, i.intro, i.lines, i.status
  from public.invoices i where i.token = p_token;
$$;
grant execute on function public.get_invoice(text) to anon, authenticated;
