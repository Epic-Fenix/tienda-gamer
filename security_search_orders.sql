-- S2: search_orders sin exponer PII. Devuelve solo resumen (sin nombre/correo/teléfono/dirección).
-- El access_token se entrega SOLO cuando se busca por código exacto (prueba de posesión del código);
-- por teléfono devuelve token null → no se puede abrir la boleta completa por enumeración.
drop function if exists search_orders(text);
create or replace function search_orders(p_term text)
returns table (
  id uuid,
  order_code text,
  created_at timestamptz,
  status text,
  is_full_payment boolean,
  paid_amount numeric,
  pending_amount numeric,
  items jsonb,
  access_token uuid
)
language sql
security definer
set search_path = public
as $$
  select o.id, o.order_code, o.created_at, o.status, o.is_full_payment,
         o.paid_amount, o.pending_amount, o.items,
         case when o.order_code = p_term then o.access_token else null end
  from orders o
  where o.order_code = p_term
     or regexp_replace(o.customer_phone, '\D', '', 'g') = regexp_replace(p_term, '\D', '', 'g')
  order by o.created_at desc
  limit 10;
$$;
grant execute on function search_orders(text) to anon, authenticated;
