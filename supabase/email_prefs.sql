-- ============================================================
--  E-mailová upozornění – preference uživatele (zap/vyp).
--  Spustit v Supabase → SQL Editor.
-- ============================================================

alter table public.profiles add column if not exists email_prefs jsonb not null default '{}'::jsonb;

-- Uložení vlastních preferencí (uživatel nemá přímý UPDATE grant na tento sloupec)
create or replace function public.set_email_prefs(p_prefs jsonb)
returns void
language sql security definer set search_path = public as $$
  update public.profiles set email_prefs = coalesce(p_prefs, '{}'::jsonb) where id = auth.uid();
$$;
grant execute on function public.set_email_prefs(jsonb) to authenticated;
