-- ════════════════════════════════════════════════════════════════════════════
--  Pravidelná lekce: od kdy se počítá do faktur (since).
--  Prázdné = počítá se od globálního začátku (1. 9. 2026). Vyplněné datum =
--  počítá se až od něj (aby nová lekce nezpětně naúčtovala celý měsíc).
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════
alter table public.recurring_lessons add column if not exists since date;
