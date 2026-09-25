-- SCOTT GAMES · Campos de género y N° de discos
-- Ejecuta en Supabase → SQL Editor (idempotente).
alter table public.products add column if not exists genre text;
alter table public.products add column if not exists discs integer;
