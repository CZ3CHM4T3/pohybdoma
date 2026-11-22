-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – RLS AUDIT (TECH-8)
--  Spusť v Supabase → SQL Editor. NIC NEMĚNÍ, jen čte stav.
--  Cíl: ověřit, že žádná tabulka v public nemá vypnutou RLS a že každá
--  má aspoň jednu policy (jinak přes anon klíč hrozí únik / zámek dat).
-- ════════════════════════════════════════════════════════════════════════════

-- 1) ❗ NEJDŮLEŽITĚJŠÍ: tabulky v public s VYPNUTOU RLS.
--    Výsledek MUSÍ být prázdný. Co se objeví = díra (čte/píše kdokoli s anon klíčem).
select c.relname as tabulka_bez_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = false
order by 1;

-- 2) ⚠ Tabulky s RLS, ale BEZ jediné policy.
--    RLS bez policy = nikdo (kromě service_role/ownera) nic nepřečte. Buď to tak
--    chceš (čistě serverová tabulka), nebo chybí policy. Projdi ručně.
select c.relname as tabulka_rls_bez_policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity = true
  and not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname
  )
order by 1;

-- 3) Přehled všech public tabulek: stav RLS + počet policies (pro kontrolu).
select c.relname as tabulka,
       c.relrowsecurity as rls_zapnuta,
       (select count(*) from pg_policies p
          where p.schemaname = 'public' and p.tablename = c.relname) as pocet_policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relrowsecurity asc, c.relname;

-- 4) Kontrola, že anon/authenticated nemají zbytečná práva na citlivé tabulky.
--    (Informativní – práva reguluje hlavně RLS, ale přehled se hodí.)
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as prava
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;
