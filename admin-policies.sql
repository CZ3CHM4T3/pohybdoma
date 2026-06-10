-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – oprávnění pro ADMINA (správa rozvrhu, akcí, rezervací)
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
--  Admin = e-mail níže (musí sedět s ADMIN_EMAILS v src/lib/admin.ts).
-- ════════════════════════════════════════════════════════════════════════════

-- Funkce: je přihlášený uživatel admin? (podle e-mailu v jeho tokenu)
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select (auth.jwt() ->> 'email') = 'schroffelh@seznam.cz';
$$;

-- Práva na úrovni tabulek (RLS dál pustí jen admina):
grant select, insert, update, delete
  on public.availability_weekly, public.availability_overrides, public.events
  to authenticated;
grant select, update on public.bookings to authenticated;

-- Admin spravuje týdenní rozvrh
drop policy if exists "admin rozvrh" on public.availability_weekly;
create policy "admin rozvrh" on public.availability_weekly
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Admin spravuje výjimky (konkrétní data)
drop policy if exists "admin vyjimky" on public.availability_overrides;
create policy "admin vyjimky" on public.availability_overrides
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Admin spravuje akce
drop policy if exists "admin akce" on public.events;
create policy "admin akce" on public.events
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Admin vidí všechny rezervace
drop policy if exists "admin cte rezervace" on public.bookings;
create policy "admin cte rezervace" on public.bookings
  for select to authenticated
  using (public.is_admin());

-- Admin může měnit stav rezervací (potvrzení / zrušení)
drop policy if exists "admin upravuje rezervace" on public.bookings;
create policy "admin upravuje rezervace" on public.bookings
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
