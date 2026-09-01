-- =====================================================================
-- SCOTT GAMES · Corrección de erratas en nombres de productos
-- Ejecuta en Supabase → SQL Editor. Idempotente y seguro de re-ejecutar.
-- =====================================================================

-- "Alien Insolation" → "Alien Isolation"
update public.products
set name = replace(name, 'Insolation', 'Isolation')
where name ilike '%Insolation%';

-- "The Evil Withim" → "The Evil Within"
update public.products
set name = replace(name, 'Withim', 'Within')
where name ilike '%Withim%';

-- Verifica los cambios:
-- select name from public.products where name ilike '%Isolation%' or name ilike '%Within%';
