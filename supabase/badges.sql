-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – Síň slávy: přišpendlené odznaky u jména. Spusť v SQL Editoru.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles add column if not exists pinned_badges text[] default '{}';

-- Uložení vlastních přišpendlených odznaků (max 3 hlídá appka)
create or replace function public.set_pinned_badges(p_ids text[])
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set pinned_badges = coalesce(p_ids, '{}') where id = auth.uid();
end; $$;
grant execute on function public.set_pinned_badges(text[]) to authenticated;

-- Přišpendlené odznaky více uživatelů (pro zobrazení u jmen v komunitě)
create or replace function public.pinned_for(p_ids uuid[])
returns table (id uuid, pinned_badges text[])
language sql stable security definer set search_path = public as $$
  select p.id, coalesce(p.pinned_badges, '{}') from public.profiles p where p.id = any(p_ids);
$$;
grant execute on function public.pinned_for(uuid[]) to authenticated;
