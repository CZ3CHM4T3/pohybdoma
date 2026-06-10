-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – pořadí recenzí (řazení přetažením v adminu)
--  Spusť v Supabase SQL Editoru. Předpoklad: reviews.sql. Lze spustit opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.reviews add column if not exists position int;

-- Doplň výchozí pořadí podle data (nejnovější nahoře), kde ještě chybí
with ordered as (
  select id, row_number() over (order by created_at desc) - 1 as rn
  from public.reviews
  where position is null
)
update public.reviews r
set position = o.rn
from ordered o
where r.id = o.id;
