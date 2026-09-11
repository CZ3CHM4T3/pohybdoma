-- ════════════════════════════════════════════════════════════════════════════
--  OPRAVA: docházka skupin (block_attendance) MUSÍ být klíčovaná podle DATA,
--  tj. unikát (block_id, date, name). Starší verze mohla mít klíč bez data
--  (block_id, name) → nový týden pak PŘEPSAL minulý. Tohle to napraví.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně. Data nemaže.
--  (Nesahá na primární klíč ani indexy – jen na unikátní CONSTRAINTY.)
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Zahoď jen CHYBNÉ unikátní CONSTRAINTY (ne PK, ne správný klíč)
do $$
declare c record;
begin
  for c in
    select con.conname, pg_get_constraintdef(con.oid) as def
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'block_attendance'
      and con.contype = 'u'                                  -- jen UNIQUE (ne PK)
      and pg_get_constraintdef(con.oid) <> 'UNIQUE (block_id, date, name)'
  loop
    execute format('alter table public.block_attendance drop constraint %I', c.conname);
  end loop;
end $$;

-- 2) Zajisti SPRÁVNÝ unikát (block_id, date, name)
do $$
begin
  if not exists (
    select 1 from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'block_attendance'
      and con.contype = 'u' and pg_get_constraintdef(con.oid) = 'UNIQUE (block_id, date, name)'
  ) then
    alter table public.block_attendance
      add constraint block_attendance_block_id_date_name_key unique (block_id, date, name);
  end if;
end $$;

-- 3) Kontrola: vypiš, jaké klíče na tabulce teď jsou
select con.conname as nazev, pg_get_constraintdef(con.oid) as definice
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace n on n.oid = rel.relnamespace
where n.nspname = 'public' and rel.relname = 'block_attendance'
order by con.contype;
