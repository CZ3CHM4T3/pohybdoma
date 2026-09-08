-- ════════════════════════════════════════════════════════════════════════════
--  FAKTURAČNÍ RODINY (sloučení plateb pod jednoho plátce).
--  Libovolné jméno (klient, dítě ze skupiny, účastník kruháče) lze „fakturovat
--  pod" jiného člověka – ve Fakturách se pak vše sečte pod něj.
--  Např. děti na PPT + kruháč mámy → vše pod „Karolína Nováková".
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.billing_map (
  name       text primary key,
  bill_to    text not null,
  created_at timestamptz not null default now()
);

alter table public.billing_map enable row level security;
drop policy if exists "admin billing map" on public.billing_map;
create policy "admin billing map" on public.billing_map
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
