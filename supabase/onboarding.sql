-- ============================================================
--  Onboarding průvodce (úvodní „babysitting" pro nového člena)
--  Kroky spravuje admin; člen je vidí jednou po přihlášení.
--  Spustit v Supabase → SQL Editor.
-- ============================================================

create table if not exists public.onboarding_steps (
  id         bigint generated always as identity primary key,
  position   int  not null default 0,
  title      text not null,
  body       text not null default '',
  image_url  text,
  cx         real not null default 50,   -- střed kroužku X v % obrázku
  cy         real not null default 50,   -- střed kroužku Y v %
  radius     real not null default 10,   -- poloměr kroužku v % šířky
  created_at timestamptz not null default now()
);
create index if not exists onboarding_steps_pos_idx on public.onboarding_steps (position);

alter table public.onboarding_steps enable row level security;

-- čtení: každý přihlášený (průvodce se ukazuje členům)
drop policy if exists "ob read" on public.onboarding_steps;
create policy "ob read" on public.onboarding_steps
  for select to authenticated using (true);

-- zápis: jen admin
drop policy if exists "ob admin write" on public.onboarding_steps;
create policy "ob admin write" on public.onboarding_steps
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on public.onboarding_steps to authenticated;
