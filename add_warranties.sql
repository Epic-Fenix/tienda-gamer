-- Registro de garantías (auto-registro del cliente si perdió su tarjeta).
create table if not exists warranties (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  dni text not null,
  customer_phone text not null,
  product text,
  created_at timestamptz not null default now()
);

alter table warranties enable row level security;

-- El cliente puede registrarse (insert). Solo admin lee/edita.
create policy warranties_insert_public on warranties for insert with check (true);
create policy warranties_rw_admin on warranties for all
  using (is_admin()) with check (is_admin());
