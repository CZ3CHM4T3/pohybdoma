-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – denní limit dotazů na AI pomocníka Jeníka (ochrana nákladů)
--  Spusť v Supabase SQL Editoru. Lze spustit opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.assistant_usage (
  ip    text not null,
  day   date not null default current_date,
  count int  not null default 0,
  primary key (ip, day)
);

alter table public.assistant_usage enable row level security;
-- Žádné veřejné RLS politiky → přístup jen přes funkci níže (SECURITY DEFINER).

-- Atomicky zvýší počítadlo pro danou IP a dnešní den, ale jen pokud je pod limitem.
-- Vrací TRUE = dotaz povolen, FALSE = denní limit vyčerpán.
create or replace function public.asistent_limit(p_ip text, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  c int;
begin
  insert into public.assistant_usage (ip, day, count)
  values (p_ip, current_date, 0)
  on conflict (ip, day) do nothing;

  update public.assistant_usage
     set count = count + 1
   where ip = p_ip and day = current_date and count < p_max
  returning count into c;

  return c is not null; -- našlo a zvýšilo = povoleno
end;
$$;

grant execute on function public.asistent_limit(text, int) to anon, authenticated;

-- Úklid starých záznamů (volitelné, můžeš spouštět ručně občas):
-- delete from public.assistant_usage where day < current_date - 7;
