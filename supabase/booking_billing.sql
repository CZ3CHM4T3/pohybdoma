-- ════════════════════════════════════════════════════════════════════════════
--  Fakturační údaje u rezervací + jejich zapamatování v profilu klienta.
--  Jméno + adresa povinné (fyzická osoba i firma), IČO/DIČ volitelné (firmy).
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

-- Na rezervaci (z čeho vystavit fakturu)
alter table public.bookings add column if not exists bill_name    text;
alter table public.bookings add column if not exists bill_address text;
alter table public.bookings add column if not exists bill_ico     text;
alter table public.bookings add column if not exists bill_dic     text;

-- V profilu (aby se přihlášenému klientovi příště předvyplnilo)
alter table public.profiles add column if not exists bill_name    text;
alter table public.profiles add column if not exists bill_address text;
alter table public.profiles add column if not exists bill_ico     text;
alter table public.profiles add column if not exists bill_dic     text;

-- Klient smí uložit svá fakturační data (a jméno) do vlastního profilu
grant update (full_name, bill_name, bill_address, bill_ico, bill_dic) on public.profiles to authenticated;

drop policy if exists "uzivatel upravuje svuj profil billing" on public.profiles;
create policy "uzivatel upravuje svuj profil billing" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
