-- ════════════════════════════════════════════════════════════════════════════
--  CENA ZA LEKCI U SKUPINOVÝCH BLOKŮ (kruháč, PPT…).
--  Každý výskyt bloku (den, kdy blok běží) se pak počítá do Faktur/Příjmů
--  danou částkou, rozděleně po měsících.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.recurring_blocks add column if not exists price_kc integer;
