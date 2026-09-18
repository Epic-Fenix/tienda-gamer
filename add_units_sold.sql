-- Unidades vendidas acumuladas por producto (para "Ganancia Realizada").
-- El producto NO se elimina al venderse: baja stock y sube units_sold.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS units_sold integer NOT NULL DEFAULT 0;
