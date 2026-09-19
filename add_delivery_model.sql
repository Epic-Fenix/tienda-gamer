-- B3: modelo por entrega. Crear pedido RESERVA stock (no cuenta venta).
-- La "Ganancia Neta" se calcula desde pedidos ENTREGADOS (en el panel) + ventas físicas.
-- reserve_stock: baja stock (reserva). qty acotado [1..50]. Público (checkout anónimo).
create or replace function reserve_stock(items jsonb)
returns void language sql security definer set search_path = public as $$
  update products p set stock = greatest(0, p.stock - x.qty)
  from (select (e->>'id')::uuid id, least(greatest((e->>'qty')::int,1),50) qty
        from jsonb_array_elements(items) e) x
  where p.id = x.id;
$$;
grant execute on function reserve_stock(jsonb) to anon, authenticated;

-- release_stock: devuelve stock al cancelar un pedido. Solo admin autenticado.
create or replace function release_stock(items jsonb)
returns void language sql security definer set search_path = public as $$
  update products p set stock = p.stock + x.qty
  from (select (e->>'id')::uuid id, least(greatest((e->>'qty')::int,1),50) qty
        from jsonb_array_elements(items) e) x
  where p.id = x.id;
$$;
revoke execute on function release_stock(jsonb) from anon, public;
grant execute on function release_stock(jsonb) to authenticated;
