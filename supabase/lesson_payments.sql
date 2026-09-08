-- ════════════════════════════════════════════════════════════════════════════
--  ZAPLACENO – označení jednotlivých lekcí jako uhrazených.
--  Klíč (ref) = identita položky v rozvrhu/faktuře:
--    rec:<id>:<datum>  pravidelná lekce · <uuid> jednorázová · <uuid> rezervace
--    blk:<id>:<datum>  výskyt bloku · blk:<id>:<YYYY-MM> měsíční blok (kruháč)
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.lesson_payments (
  ref        text primary key,
  paid_at    timestamptz not null default now()
);

alter table public.lesson_payments enable row level security;
drop policy if exists "admin lesson payments" on public.lesson_payments;
create policy "admin lesson payments" on public.lesson_payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
