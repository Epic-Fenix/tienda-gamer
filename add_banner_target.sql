-- SCOTT GAMES · Deep-link de banners a productos
-- Ejecuta en Supabase → SQL Editor (idempotente).
alter table public.banners add column if not exists target_product_slug text;
