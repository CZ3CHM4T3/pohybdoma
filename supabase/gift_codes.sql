-- ============================================================
--  Dárkové členství kódem.
--  Admin vygeneruje kód (úroveň + počet měsíců), obdarovaný ho uplatní.
--  Spustit v Supabase → SQL Editor.
-- ============================================================

create table if not exists public.gift_codes (
  id          bigint generated always as identity primary key,
  code        text not null unique,
  tier        text not null check (tier in ('member','vip','vip_plus')),
  months      int  not null default 1 check (months between 1 and 24),
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.gift_codes enable row level security;
-- žádné přímé čtení/zápis pro běžné uživatele; vše přes funkce níže
revoke all on public.gift_codes from anon, authenticated;

-- Admin: vygeneruje nový kód a vrátí ho.
-- p_log_income = true → zapíše tržbu (dárek byl koupen): cena úrovně × měsíce.
drop function if exists public.create_gift_code(text, int);
create or replace function public.create_gift_code(p_tier text, p_months int, p_log_income boolean default true)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_months int := greatest(1, least(24, p_months));
  v_price numeric;
  i int;
begin
  if not public.is_admin() then raise exception 'Nedostatecna opravneni'; end if;
  if p_tier not in ('member','vip','vip_plus') then raise exception 'Neplatna uroven'; end if;
  loop
    v_code := 'DAR-';
    for i in 1..4 loop v_code := v_code || substr(v_chars, 1 + floor(random()*length(v_chars))::int, 1); end loop;
    v_code := v_code || '-';
    for i in 1..4 loop v_code := v_code || substr(v_chars, 1 + floor(random()*length(v_chars))::int, 1); end loop;
    exit when not exists (select 1 from public.gift_codes where code = v_code);
  end loop;
  insert into public.gift_codes (code, tier, months) values (v_code, p_tier, v_months);

  if p_log_income then
    v_price := case p_tier when 'member' then 199 when 'vip' then 399 when 'vip_plus' then 599 else 0 end;
    if v_price > 0 then
      begin
        insert into public.finance_entries (kind, category, amount_kc, note)
        values ('income',
                case p_tier when 'member' then 'MEMBER' when 'vip' then 'VIP' else 'VIP+' end,
                round(v_price * v_months),
                'Dárkové členství');
      exception when others then null;
      end;
    end if;
  end if;
  return v_code;
end;
$$;
grant execute on function public.create_gift_code(text, int, boolean) to authenticated;

-- Admin: seznam kódů (jako JSON)
create or replace function public.list_gift_codes()
returns jsonb
language sql security definer set search_path = public, auth as $$
  select case when public.is_admin() then coalesce((
    select jsonb_agg(jsonb_build_object(
      'code', g.code, 'tier', g.tier, 'months', g.months,
      'redeemed', g.redeemed_by is not null,
      'redeemed_at', g.redeemed_at,
      'created_at', g.created_at
    ) order by g.created_at desc) from public.gift_codes g
  ), '[]'::jsonb) else '[]'::jsonb end;
$$;
grant execute on function public.list_gift_codes() to authenticated;

-- Obdarovaný: uplatní kód → nastaví si členství
create or replace function public.redeem_gift_code(p_code text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  g record;
begin
  if auth.uid() is null then return 'not_logged'; end if;
  select * into g from public.gift_codes where code = upper(btrim(p_code));
  if not found then return 'invalid'; end if;
  if g.redeemed_by is not null then return 'used'; end if;

  update public.gift_codes set redeemed_by = auth.uid(), redeemed_at = now() where id = g.id;
  update public.profiles
     set tier = g.tier,
         tier_since = now(),
         tier_until = greatest(coalesce(tier_until, now()), now()) + make_interval(months => g.months)
   where id = auth.uid();
  return 'ok:' || g.tier;
end;
$$;
grant execute on function public.redeem_gift_code(text) to authenticated;
