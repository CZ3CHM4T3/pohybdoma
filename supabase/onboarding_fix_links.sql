-- Oprava odkazů u kroků průvodce (spustit v Supabase, klidně opakovaně).
alter table public.onboarding_steps add column if not exists href text;

update public.onboarding_steps set href = '/videoknihovna' where title = 'Knihovna pohybu';
update public.onboarding_steps set href = '/ucet'          where title = 'Moje cesta – tvoje základna';
update public.onboarding_steps set href = '/denik'         where title = 'Můj deník';
update public.onboarding_steps set href = '/ucet'          where title = 'Můj kalendář';
update public.onboarding_steps set href = '/kruhy'         where title like 'Komunita%';
update public.onboarding_steps set href = '/ucet'          where title = 'Výzvy, žebříček a odznaky';
update public.onboarding_steps set href = '/videoknihovna' where title = 'A teď hlavně začni';

-- normalizace: doplň chybějící úvodní lomítko (jinak router bere odkaz relativně → 404)
update public.onboarding_steps
   set href = '/' || ltrim(href, '/')
 where href is not null and href <> '' and left(href, 1) <> '/' and href not like 'http%';
