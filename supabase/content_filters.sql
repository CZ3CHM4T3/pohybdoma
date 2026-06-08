-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – rozšíření videí o filtry: systém, co dům dá, vhodnost
--  Spusť v Supabase SQL Editoru. Předpoklad: content.sql. Lze spustit opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.videos
  add column if not exists systems        text[] default '{}',   -- floorwork, kettlebell, dech…
  add column if not exists props          text[] default '{}',   -- gauč, židle, tyč, zeď, zem…
  add column if not exists unsuitable_for text[] default '{}';    -- kontraindikace (skryje nevhodné)
