-- Venta atómica: descuenta stock y acumula unidades vendidas en un solo UPDATE
-- (evita sobreventa por condición de carrera del read-modify-write en el cliente).
-- items = jsonb array: [{ "id": "<uuid>", "qty": 2 }, ...]
create or replace function sell_items(items jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  -- qty positivo = venta (baja stock, sube vendidos); qty negativo = revertir (cancelación).
  update products p
     set stock = greatest(0, p.stock - x.qty),
         units_sold = greatest(0, coalesce(p.units_sold, 0) + x.qty)
  from (
    select (e->>'id')::uuid as id, (e->>'qty')::int as qty
    from jsonb_array_elements(items) e
  ) x
  where p.id = x.id;
$$;

grant execute on function sell_items(jsonb) to anon, authenticated;
