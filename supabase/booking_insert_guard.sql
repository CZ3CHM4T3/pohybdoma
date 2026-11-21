-- TECH-2: Zabezpečení zápisu rezervací.
-- Rezervace se zakládá z prohlížeče (anon/authenticated). Bez ochrany by šlo
-- podvrhnout cizí user_id nebo rovnou status='confirmed'. Tento trigger to hlídá
-- na úrovni DB, nezávisle na klientovi.
--
-- Pozn.: cenu (price_kc) tu zatím nevaliduji proti ceníku – ceny nejsou v DB
-- tabulce. Admin rezervace před fakturací stejně potvrzuje ručně. Až budou ceny
-- v DB, dá se sem doplnit kontrola částky.
--
-- Vyžaduje existující funkci public.is_admin() (už se používá v RLS).
-- Spusť v Supabase → SQL editor.

create or replace function public.enforce_booking_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admin může zakládat rezervace volně (nic nevynucujeme).
  if public.is_admin() then
    return new;
  end if;

  -- Běžný uživatel: rezervace je vždy "pending" (nelze se sám potvrdit).
  new.status := 'pending';

  -- user_id nelze podvrhnout – vždy vlastní účet (nebo null u anonymní rezervace).
  if auth.uid() is null then
    new.user_id := null;
  else
    new.user_id := auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_booking_insert on public.bookings;
create trigger trg_enforce_booking_insert
  before insert on public.bookings
  for each row execute function public.enforce_booking_insert();
