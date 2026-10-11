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
  constraint invoice_config_singleton check (id = 1)
);

insert into public.invoice_config
  (id, business_name, business_address, business_ico, iban, account_display, due_days, vat_payer, next_number, footer_note)
values
  (1, 'Mgr. Jan Schröffel', 'Chovatelů 159, Hradištko, 252 09', '04531817',
   'CZ4130300000003470043017', '3470043017/3030', 7, false, 20260163,
   'Nejsem plátce DPH.')
on conflict (id) do nothing;

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
  lines      jsonb not null default '[]'::jsonb,
  status     text not null default 'issued', -- issued | sent | paid
  sent_at    timestamptz,
  paid_at    timestamptz,
  created_at timestamptz not null default now()
);
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
create or replace function public.get_invoice(p_token text)
returns table (
  number bigint, payer_name text, bill_name text, address text, ico text,
  month text, issued_on date, due_on date, amount integer, vs text,
  lines jsonb, status text
) language sql security definer set search_path = public stable as $$
  select i.number, i.payer_name, i.bill_name, i.address, i.ico, i.month,
         i.issued_on, i.due_on, i.amount, i.vs, i.lines, i.status
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
