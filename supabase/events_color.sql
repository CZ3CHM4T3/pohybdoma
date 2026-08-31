-- ════════════════════════════════════════════════════════════════════════════
--  AKCE V KALENDÁŘI: barva zobrazení + konec akce.
--  Umožní vytvářet akce/workshopy klikem do kalendáře (Můj rozvrh) a zobrazit je
--  barevně i ve veřejném týdenním kalendáři.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.events add column if not exists color    text;
alter table public.events add column if not exists end_time text;
