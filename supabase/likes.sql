-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – lajky u článků blogu (Pohybová Myslánka)
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

-- Počet lajků na článek (klíč = slug článku)
create table if not exists public.post_likes (
  slug text primary key,
  likes integer not null default 0
);

alter table public.post_likes enable row level security;

-- Počty lajků smí číst kdokoliv
drop policy if exists "verejne cteni lajku" on public.post_likes;
create policy "verejne cteni lajku" on public.post_likes
  for select using (true);

grant select on public.post_likes to anon, authenticated;

-- Změna počtu lajků jen přes bezpečnou funkci (±1), ne přímým zápisem do tabulky
create or replace function public.adjust_likes(p_slug text, p_delta int)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  if p_delta not in (-1, 1) then
    raise exception 'delta musí být -1 nebo 1';
  end if;
  insert into public.post_likes (slug, likes)
    values (p_slug, greatest(0, p_delta))
  on conflict (slug)
    do update set likes = greatest(0, public.post_likes.likes + p_delta)
  returning likes into new_count;
  return new_count;
end;
$$;

grant execute on function public.adjust_likes(text, int) to anon, authenticated;
