-- Módulo Importaciones / Pedidos de Japón.
create table if not exists imports (
  id uuid primary key default gen_random_uuid(),
  title text not null,               -- Qué se pidió (ej. "PS5 Slim + God of War")
  supplier text,                     -- Proveedor / tienda de origen
  quantity int not null default 1,
  cost_yen numeric,                  -- Costo en yenes (opcional)
  cost_soles numeric,                -- Costo en soles ya convertido (opcional)
  tracking text,                     -- N° de seguimiento
  status text not null default 'pedido',  -- pedido | en_camino | recibido
  notes text,
  created_at timestamptz not null default now()
);

alter table imports enable row level security;

-- Solo admin ve y gestiona importaciones (nunca es público).
create policy imports_rw_admin on imports for all
  using (is_admin()) with check (is_admin());
