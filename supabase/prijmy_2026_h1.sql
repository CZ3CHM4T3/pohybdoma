-- ════════════════════════════════════════════════════════════════════════════
--  POHYB DOMA – ruční příjmy 1. pololetí 2026 (než pojede web naostro)
--  Kategorie:  "Fitko"        = tenisová a fitness akademie
--              "Osobní lekce" = zbytek (celkem − akademie)
--  Spusť v Supabase → SQL Editor → Run. Lze spustit OPAKOVANĚ (nejdřív smaže
--  tyto dvě kategorie za leden–červen 2026, pak vloží znovu = žádné duplicity).
--  Vyžaduje tabulku finance_entries (finance.sql).
-- ════════════════════════════════════════════════════════════════════════════

delete from public.finance_entries
where kind = 'income'
  and category in ('Fitko', 'Osobní lekce')
  and at >= date '2026-01-01' and at < date '2026-07-01';

insert into public.finance_entries (kind, category, amount_kc, at) values
  ('income', 'Fitko',         27188, '2026-01-01'),
  ('income', 'Osobní lekce',  48750, '2026-01-01'),
  ('income', 'Fitko',         36010, '2026-02-01'),
  ('income', 'Osobní lekce',  57670, '2026-02-01'),
  ('income', 'Fitko',         35462, '2026-03-01'),
  ('income', 'Osobní lekce',  48950, '2026-03-01'),
  ('income', 'Fitko',         30360, '2026-04-01'),
  ('income', 'Osobní lekce',  58475, '2026-04-01'),
  ('income', 'Fitko',         40000, '2026-05-01'),
  ('income', 'Osobní lekce',  61600, '2026-05-01'),
  ('income', 'Fitko',         42770, '2026-06-01'),
  ('income', 'Osobní lekce',  77750, '2026-06-01');
