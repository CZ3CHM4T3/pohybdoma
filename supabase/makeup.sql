-- ════════════════════════════════════════════════════════════════════════════
--  NÁHRADY LEKCÍ (makeup)
--  Když se klient včas omluví, lektor mu nabídne pár volných termínů. Klient si
--  v účtu jeden vybere (rezervuje se) nebo řekne, že nevyhovuje žádný.
--  Předpoklad: pd_send_email (email_automation.sql), lesson_plans, is_admin().
--  Spustit v Supabase → SQL Editor. Bezpečné i opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.makeup_offers (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references auth.users (id) on delete cascade,
  client_name text not null default '',
  note        text,
  status      text not null default 'open', -- open | accepted | declined
  created_at  timestamptz not null default now()
);

create table if not exists public.makeup_slots (
  id         uuid primary key default gen_random_uuid(),
  offer_id   uuid not null references public.makeup_offers (id) on delete cascade,
  date       date not null,
  time       text not null,   -- "HH:MM"
  chosen     boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists makeup_slots_offer_idx on public.makeup_slots (offer_id);

alter table public.makeup_offers enable row level security;
alter table public.makeup_slots  enable row level security;

-- Admin spravuje vše
drop policy if exists "admin makeup offers" on public.makeup_offers;
create policy "admin makeup offers" on public.makeup_offers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin makeup slots" on public.makeup_slots;
create policy "admin makeup slots" on public.makeup_slots for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Klient vidí své nabídky a jejich termíny
drop policy if exists "klient cte sve makeup" on public.makeup_offers;
create policy "klient cte sve makeup" on public.makeup_offers for select to authenticated
  using (client_id = auth.uid());
drop policy if exists "klient cte sve makeup sloty" on public.makeup_slots;
create policy "klient cte sve makeup sloty" on public.makeup_slots for select to authenticated
  using (exists (select 1 from public.makeup_offers o where o.id = offer_id and o.client_id = auth.uid()));

-- ── Lektor vytvoří nabídku (offer + termíny) a pošle klientovi e-mail ──
create or replace function public.create_makeup(p_client_id uuid, p_client_name text, p_note text, p_slots jsonb)
returns uuid
language plpgsql security definer set search_path = public as $$
declare oid uuid; s jsonb; em text; rows text := '';
begin
  if not public.is_admin() then raise exception 'jen admin'; end if;
  insert into public.makeup_offers (client_id, client_name, note) values (p_client_id, coalesce(p_client_name, ''), nullif(p_note, ''))
    returning id into oid;
  for s in select * from jsonb_array_elements(p_slots) loop
    insert into public.makeup_slots (offer_id, date, time) values (oid, (s->>'date')::date, s->>'time');
    rows := rows || '<li>' || to_char((s->>'date')::date, 'DD.MM.YYYY') || ' v ' || (s->>'time') || '</li>';
  end loop;
  -- e-mail klientovi
  select email into em from public.profiles where id = p_client_id;
  if em is not null then
    perform public.pd_send_email(
      em,
      'Nabídka náhradních termínů – POHYB DOMA',
      '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B">' ||
      '<h2 style="color:#062A6B">Náhrada za tvoji lekci</h2>' ||
      '<p style="color:#444">Nabízím ti tyto náhradní termíny:</p>' ||
      '<ul style="color:#333">' || rows || '</ul>' ||
      case when p_note is not null and p_note <> '' then '<p style="color:#444">' || p_note || '</p>' else '' end ||
      '<p style="margin:18px 0 22px"><a href="https://pohybdoma.cz/ucet" style="background:#1976FF;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:bold">Vybrat termín</a></p>' ||
      '<p style="color:#888;font-size:12px">Vyber si v účtu jeden termín, nebo dej vědět, že nevyhovuje žádný.</p></div>'
    );
  end if;
  return oid;
end;
$$;

-- ── Klient si vybere termín → rezervuje se (lesson_plans) + e-mail lektorovi ──
create or replace function public.accept_makeup(p_slot uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare o public.makeup_offers; sl public.makeup_slots;
begin
  select * into sl from public.makeup_slots where id = p_slot;
  if sl is null then return false; end if;
  select * into o from public.makeup_offers where id = sl.offer_id;
  if o is null or o.client_id <> auth.uid() or o.status <> 'open' then raise exception 'nabidka neni dostupna'; end if;

  update public.makeup_slots set chosen = true where id = p_slot;
  update public.makeup_offers set status = 'accepted' where id = o.id;
  insert into public.lesson_plans (date, time, client_name, note, price_kc)
    values (sl.date, sl.time, o.client_name, 'Náhrada', 0);

  perform public.pd_send_email(
    'schroffelh@seznam.cz',
    'Náhrada vybrána: ' || o.client_name || ' – ' || to_char(sl.date, 'DD.MM.YYYY'),
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B">' ||
    '<h2 style="color:#062A6B">Klient si vybral náhradu</h2>' ||
    '<p style="color:#444"><strong>' || o.client_name || '</strong> si vybral termín <strong>' ||
      to_char(sl.date, 'DD.MM.YYYY') || ' v ' || sl.time || '</strong>. Přidal jsem ho do rozvrhu.</p></div>'
  );
  return true;
end;
$$;

-- ── Klient: nevyhovuje žádný ── (+ e-mail lektorovi)
create or replace function public.decline_makeup(p_offer uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare o public.makeup_offers;
begin
  select * into o from public.makeup_offers where id = p_offer;
  if o is null or o.client_id <> auth.uid() or o.status <> 'open' then raise exception 'nabidka neni dostupna'; end if;
  update public.makeup_offers set status = 'declined' where id = o.id;
  perform public.pd_send_email(
    'schroffelh@seznam.cz',
    'Náhrada odmítnuta: ' || o.client_name,
    '<div style="font-family:Arial,Helvetica,sans-serif;color:#062A6B">' ||
    '<p style="color:#444"><strong>' || o.client_name || '</strong> odmítl(a) nabídnuté náhradní termíny (nevyhovoval žádný).</p></div>'
  );
  return true;
end;
$$;

grant execute on function public.create_makeup(uuid, text, text, jsonb) to authenticated;
grant execute on function public.accept_makeup(uuid) to authenticated;
grant execute on function public.decline_makeup(uuid) to authenticated;
