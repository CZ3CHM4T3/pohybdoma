-- ════════════════════════════════════════════════════════════════════════════
--  STORNO faktury
--  • invoices.status může nově být i "storno" (vedle issued | sent | paid)
--  • storno_at = kdy byla faktura stornována (pro doložitelnost)
--  Stornovaná faktura si PONECHÁVÁ své číslo (doložené storno, ne tichá mezera).
--  Po stornu se plátce zase objeví jako „k vyfakturování" a vystaví se nová
--  (opravená) faktura s NOVÝM číslem.
--  Nastavuje admin přes běžný UPDATE (RLS policy „admin invoices" to už povoluje).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.invoices
  add column if not exists storno_at timestamptz;

comment on column public.invoices.storno_at is
  'Kdy byla faktura stornována. Spolu se status=''storno'' označuje zrušený doklad (číslo zůstává).';
