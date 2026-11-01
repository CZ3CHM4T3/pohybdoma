-- ════════════════════════════════════════════════════════════════════════════
--  ÚKLID: smaže fakturaci, která OMYLEM vznikla na špatném projektu (MS GEM).
--  ⚠️ SPUSTIT JEN NA PROJEKTU MS GEM — NIKDY NA pohybdoma (elavgxuequqnptbjswqn)!
--  Maže jen fakturační tabulky/funkce. Tabulek MS GEMu se nedotkne.
-- ════════════════════════════════════════════════════════════════════════════
drop table if exists public.invoice_skip          cascade;
drop table if exists public.invoices              cascade;
drop table if exists public.billing_profiles      cascade;
drop table if exists public.invoice_config        cascade;
drop table if exists public.invoice_extras        cascade;
drop table if exists public.client_service_price  cascade;
drop table if exists public.service_price_history cascade;
drop table if exists public.service_catalog       cascade;

drop function if exists public.get_invoice(text)                   cascade;
drop function if exists public.next_invoice_number()               cascade;
drop function if exists public.admin_send_email(text, text, text)  cascade;
