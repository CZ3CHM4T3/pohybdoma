-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – ÚČET: profilová fotka + platnost členství
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
--  Předpoklad: membership.sql (set_user_tier, profiles práva).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) Nové sloupce v profilu ───────────────────────────────────────────────
alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists tier_since timestamptz,
  add column if not exists tier_until timestamptz;

-- Uživatel smí měnit jméno a fotku (NE úroveň)
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- ── 2) set_user_tier nastaví i platnost (členství platí 1 měsíc) ────────────
create or replace function public.set_user_tier(target_id uuid, new_tier text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Nedostatecna opravneni';
  end if;
  if new_tier not in ('free', 'member', 'vip', 'vip_plus') then
    raise exception 'Neplatna uroven: %', new_tier;
  end if;
  if new_tier = 'free' then
    update public.profiles
      set tier = new_tier, tier_since = null, tier_until = null
      where id = target_id;
  else
    update public.profiles
      set tier = new_tier, tier_since = now(), tier_until = now() + interval '1 month'
      where id = target_id;
  end if;
end;
$$;

-- ── 3) Úložiště profilových fotek (bucket "avatars", veřejné čtení) ──────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Nahrát/přepsat smí jen do své složky (prefix = vlastní user id)
drop policy if exists "avatar upload" on storage.objects;
create policy "avatar upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar update" on storage.objects;
create policy "avatar update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar delete" on storage.objects;
create policy "avatar delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatar read" on storage.objects;
create policy "avatar read" on storage.objects
  for select to public
  using (bucket_id = 'avatars');
