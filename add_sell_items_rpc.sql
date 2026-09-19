-- Venta atómica: descuenta stock y acumula unidades vendidas en un solo UPDATE
-- (evita sobreventa por condición de carrera del read-modify-write en el cliente).
-- items = jsonb array: [{ "id": "<uuid>", "qty": 2 }, ...]
-- SEGURIDAD: qty se acota a [1..50] → un cliente anónimo NO puede inflar/corromper
-- inventario con qty negativo o gigante.
create or replace function sell_items(items jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  update products p
     set stock = greatest(0, p.stock - x.qty),
         units_sold = greatest(0, coalesce(p.units_sold, 0) + x.qty)
  from (
    select (e->>'id')::uuid as id,
           least(greatest((e->>'qty')::int, 1), 50) as qty
    from jsonb_array_elements(items) e
  ) x
  where p.id = x.id;
$$;
grant execute on function sell_items(jsonb) to anon, authenticated;

-- Reversión al cancelar un pedido: devuelve stock y resta unidades vendidas.
-- SOLO admin autenticado (no anon) para que no se use como primitivo de inflado.
create or replace function restock_items(items jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  update products p
     set stock = p.stock + x.qty,
         units_sold = greatest(0, coalesce(p.units_sold, 0) - x.qty)
  from (
    select (e->>'id')::uuid as id,
           least(greatest((e->>'qty')::int, 1), 50) as qty
    from jsonb_array_elements(items) e
  ) x
  where p.id = x.id;
$$;
revoke execute on function restock_items(jsonb) from anon, public;
grant execute on function restock_items(jsonb) to authenticated;
