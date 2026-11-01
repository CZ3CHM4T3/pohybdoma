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
