-- Lista de correos para marketing (newsletter). Consentimiento explícito del cliente.
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  source text,                 -- de dónde vino (footer, checkout, etc.)
  consent boolean not null default true,  -- aceptó recibir novedades
  created_at timestamptz not null default now()
);

-- Un correo, una suscripción (evita duplicados). Guardamos en minúsculas desde la app.
create unique index if not exists subscribers_email_uidx on subscribers (email);

alter table subscribers enable row level security;

-- El cliente puede suscribirse (insert). Solo admin lee/gestiona.
create policy subscribers_insert_public on subscribers for insert with check (true);
create policy subscribers_rw_admin on subscribers for all
  using (is_admin()) with check (is_admin());
