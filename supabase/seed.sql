-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – počáteční data (rozvrh + akce)
--  Spusť v Supabase: SQL Editor → vlož → Run. Lze spustit opakovaně.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Týdenní rozvrh: každý pracovní den 08–19, volné jen vybrané hodiny ────────
delete from public.availability_weekly;

insert into public.availability_weekly (weekday, time, is_free) values
  -- Pondělí (1): volno 10:00
  (1,'08:00',false),(1,'09:00',false),(1,'10:00',true),(1,'11:00',false),
  (1,'12:00',false),(1,'13:00',false),(1,'14:00',false),(1,'15:00',false),
  (1,'16:00',false),(1,'17:00',false),(1,'18:00',false),
  -- Úterý (2): volno 14:00
  (2,'08:00',false),(2,'09:00',false),(2,'10:00',false),(2,'11:00',false),
  (2,'12:00',false),(2,'13:00',false),(2,'14:00',true),(2,'15:00',false),
  (2,'16:00',false),(2,'17:00',false),(2,'18:00',false),
  -- Středa (3): nic volného
  (3,'08:00',false),(3,'09:00',false),(3,'10:00',false),(3,'11:00',false),
  (3,'12:00',false),(3,'13:00',false),(3,'14:00',false),(3,'15:00',false),
  (3,'16:00',false),(3,'17:00',false),(3,'18:00',false),
  -- Čtvrtek (4): volno 13:00
  (4,'08:00',false),(4,'09:00',false),(4,'10:00',false),(4,'11:00',false),
  (4,'12:00',false),(4,'13:00',true),(4,'14:00',false),(4,'15:00',false),
  (4,'16:00',false),(4,'17:00',false),(4,'18:00',false),
  -- Pátek (5): nic volného
  (5,'08:00',false),(5,'09:00',false),(5,'10:00',false),(5,'11:00',false),
  (5,'12:00',false),(5,'13:00',false),(5,'14:00',false),(5,'15:00',false),
  (5,'16:00',false),(5,'17:00',false),(5,'18:00',false);

-- ── Akce / workshopy ─────────────────────────────────────────────────────────
delete from public.events;

insert into public.events (date, title, kind, time, location, description, price_kc) values
  ('2026-06-13','Workshop: Zdravá záda','Workshop','10:00–13:00','Dobřichovice',
   'Půldenní workshop zaměřený na úlevu a prevenci bolestí zad. Teorie i praxe, vhodné pro každého.',890),
  ('2026-06-21','Mobilita pro běžce','Seminář','09:00–11:30','Řevnice',
   'Praktický seminář, jak si jako běžec udržet zdravé kyčle, kolena a kotníky.',690),
  ('2026-07-04','Letní pohybový den pro rodiny','Akce','14:00–17:00','Karlík',
   'Odpoledne plné pohybu a her pro rodiče s dětmi. Společně, venku, v pohodě.',0);
