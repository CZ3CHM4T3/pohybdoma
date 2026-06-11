-- ============================================================
--  Stripe – sloupce pro předplatné na profiles.
--  Zapisuje do nich webhook (přes service-role), běžný uživatel je nemění.
--  Spustit v Supabase → SQL Editor.
-- ============================================================

alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists subscription_status text;
create index if not exists profiles_stripe_customer_idx on public.profiles (stripe_customer_id);
