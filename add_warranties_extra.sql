-- Mejoras a garantías: plazo de vencimiento + anti-duplicado.

-- 1) Plazo de garantía en meses (para calcular vigente/vencida). Default 3.
alter table warranties add column if not exists warranty_months int not null default 3;

-- 2) Anti-duplicado: mismo DNI + mismo producto no se registra dos veces.
--    coalesce(product,'') permite varios registros sin producto para un mismo DNI.
create unique index if not exists warranties_dni_product_uidx
  on warranties (dni, coalesce(product, ''));
