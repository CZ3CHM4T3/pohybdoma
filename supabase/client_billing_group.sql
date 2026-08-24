-- ════════════════════════════════════════════════════════════════════════════
--  Fakturační skupina (rodina) u klientů v kartotéce.
--  Dva klienti se stejnou hodnotou bill_group (např. "Kremsovi") se ve Fakturách
--  sečtou dohromady a vystaví se jim jedna faktura.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.clients add column if not exists bill_group text;
