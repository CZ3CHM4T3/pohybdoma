-- Zdravotní souhlas u rezervace (GDPR čl. 9 – zvláštní kategorie, výslovný souhlas).
-- Ukládá, že klient zaškrtl souhlas se zpracováním údajů o zdraví a kdy.
-- Spusť v Supabase → SQL editor.

alter table public.bookings
  add column if not exists health_consent    boolean      not null default false,
  add column if not exists health_consent_at timestamptz;

comment on column public.bookings.health_consent    is 'Klient zaškrtl výslovný souhlas se zpracováním údajů o zdraví (GDPR čl. 9).';
comment on column public.bookings.health_consent_at is 'Čas udělení souhlasu.';
