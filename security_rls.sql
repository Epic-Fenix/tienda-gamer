-- ============================================================================
--  SEGURIDAD RLS + RPCs — tienda-gamer (Supabase)
--  ⚠️ APLICAR CON CUIDADO Y PROBAR EN STAGING. Bloquea el acceso directo con la
--  anon key (pública) y expone los flujos públicos SOLO vía funciones controladas.
--  Requiere primero adoptar en el código las RPCs get_order / search_orders /
--  use_coupon (ver SECURITY.md §3). Si aplicas RLS sin esos cambios, el tracker,
--  la boleta y el uso de cupón dejarán de funcionar para clientes anónimos.
-- ============================================================================

-- 0) Habilitar RLS
alter table products   enable row level security;
alter table orders     enable row level security;
alter table backorders enable row level security;
alter table trade_ins  enable row level security;
alter table coupons    enable row level security;
alter table banners    enable row level security;

-- 1) PRODUCTS: lectura pública; escritura solo admin autenticado.
--    (el descuento de stock va por la RPC sell_items, security definer)
create policy products_select_public on products for select using (true);
create policy products_write_auth   on products for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 2) BANNERS: lectura pública; escritura admin.
create policy banners_select_public on banners for select using (true);
create policy banners_write_auth    on banners for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 3) COUPONS: lectura pública SOLO de activos; escritura admin.
--    (el incremento uses_count va por la RPC use_coupon, security definer)
create policy coupons_select_active on coupons for select using (is_active = true);
create policy coupons_write_auth    on coupons for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 4) ORDERS: el cliente PUEDE crear; NO puede leer/editar la tabla directamente.
--    Lectura del cliente solo por código/teléfono vía RPC (get_order/search_orders).
create policy orders_insert_public on orders for insert with check (true);
create policy orders_select_auth   on orders for select using (auth.role() = 'authenticated');
create policy orders_update_auth   on orders for update using (auth.role() = 'authenticated');
create policy orders_delete_auth   on orders for delete using (auth.role() = 'authenticated');

-- 5) BACKORDERS / TRADE_INS: el cliente crea; solo admin lee/edita.
create policy backorders_insert_public on backorders for insert with check (true);
create policy backorders_rw_auth       on backorders for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy tradeins_insert_public on trade_ins for insert with check (true);
create policy tradeins_rw_auth       on trade_ins for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 6) RPCs security definer para los flujos públicos (corren como owner, saltan RLS)

-- Boleta: buscar UNA orden por código exacto.
create or replace function get_order(p_code text)
returns setof orders language sql security definer set search_path = public as $$
  select * from orders where order_code = p_code limit 1;
$$;
grant execute on function get_order(text) to anon, authenticated;

-- Rastreador: buscar por código exacto o teléfono exacto (evita enumeración con %).
create or replace function search_orders(p_term text)
returns setof orders language sql security definer set search_path = public as $$
  select * from orders
  where order_code = p_term
     or regexp_replace(customer_phone, '\D', '', 'g') = regexp_replace(p_term, '\D', '', 'g')
  order by created_at desc limit 10;
$$;
grant execute on function search_orders(text) to anon, authenticated;

-- Uso de cupón atómico (evita que el cliente edite coupons directamente).
create or replace function use_coupon(p_code text)
returns void language sql security definer set search_path = public as $$
  update coupons set uses_count = coalesce(uses_count,0) + 1
  where upper(code) = upper(p_code) and is_active = true
    and (max_uses is null or coalesce(uses_count,0) < max_uses);
$$;
grant execute on function use_coupon(text) to anon, authenticated;
