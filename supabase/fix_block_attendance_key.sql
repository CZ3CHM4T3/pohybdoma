-- ════════════════════════════════════════════════════════════════════════════
--  OPRAVA: docházka skupin (block_attendance) MUSÍ být klíčovaná podle DATA,
--  tj. unikát (block_id, date, name). Starší verze mohla mít klíč bez data
--  (block_id, name) → nový týden pak PŘEPSAL minulý. Tohle to napraví.
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně. Data nemaže.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Zahoď všechny CHYBNÉ unikátní klíče na block_attendance (kromě správného)
do $$
declare c record;
begin
  for c in
    select con.conname, pg_get_constraintdef(con.oid) as def
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public' and rel.relname = 'block_attendance' and con.contype = 'u'
  loop
    if c.def <> 'UNIQUE (block_id, date, name)' then
      execute format('alter table public.block_attendance drop constraint %I', c.conname);
    end if;
  end loop;
end $$;

-- 2) Zahoď i případné chybné unikátní INDEXY (ne-constraint) bez data
do $$
declare i record;
begin
  for i in
    select indexname, indexdef from pg_indexes
    where schemaname = 'public' and tablename = 'block_attendance'
      and indexdef ilike '%unique%'
      and indexdef not ilike '%(block_id, date, name)%'
  loop
    execute format('drop index if exists public.%I', i.indexname);
  end loop;
end $$;

-- 3) Zajisti SPRÁVNÝ unikát (block_id, date, name)
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
