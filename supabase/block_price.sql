-- ════════════════════════════════════════════════════════════════════════════
--  CENA ZA LEKCI U SKUPINOVÝCH BLOKŮ (kruháč, PPT…).
--  Každý výskyt bloku (den, kdy blok běží) se pak počítá do Faktur/Příjmů
--  danou částkou, rozděleně po měsících.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.recurring_blocks add column if not exists price_kc integer;
-- Způsob účtování: 'per_lesson' = platí se za každou odchozenou lekci (PPT),
--                  'monthly'    = kdo přišel aspoň 1× za měsíc, platí celý měsíc (kruháč).
alter table public.recurring_blocks add column if not exists bill_mode text;
