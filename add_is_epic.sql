-- Marca manual de "Joya Épica" por producto (badge en la tarjeta + filtro "Joyas Épicas").
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_epic boolean NOT NULL DEFAULT false;
