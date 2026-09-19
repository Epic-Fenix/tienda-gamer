-- S5: autorización por ADMIN real (no "cualquier usuario logueado").
-- ⚠️ EDITA los correos de abajo con tus 2 cuentas admin ANTES de correr, o te quedas sin acceso de escritura.
-- Aplica en Supabase SQL Editor.

create table if not exists admin_emails (email text primary key);

-- >>> PON AQUÍ TUS CORREOS ADMIN <<<
insert into admin_emails (email) values
  ('correo1@gmail.com'),
  ('correo2@gmail.com')
on conflict (email) do nothing;

-- La tabla no se expone: sin policies + RLS on → solo funciones security-definer la leen.
alter table admin_emails enable row level security;

create or replace function is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function is_admin() to authenticated;

-- Reemplazar policies "authenticated" (cualquier logueado) por is_admin().
drop policy if exists products_write_auth on products;
create policy products_write_admin on products for all
  using (is_admin()) with check (is_admin());

drop policy if exists banners_write_auth on banners;
create policy banners_write_admin on banners for all
  using (is_admin()) with check (is_admin());

drop policy if exists coupons_write_auth on coupons;
create policy coupons_write_admin on coupons for all
  using (is_admin()) with check (is_admin());

drop policy if exists orders_select_auth on orders;
drop policy if exists orders_update_auth on orders;
drop policy if exists orders_delete_auth on orders;
create policy orders_select_admin on orders for select using (is_admin());
create policy orders_update_admin on orders for update using (is_admin());
create policy orders_delete_admin on orders for delete using (is_admin());

drop policy if exists backorders_rw_auth on backorders;
create policy backorders_rw_admin on backorders for all
  using (is_admin()) with check (is_admin());

drop policy if exists tradeins_rw_auth on trade_ins;
create policy tradeins_rw_admin on trade_ins for all
  using (is_admin()) with check (is_admin());

-- restock_items (reversión) también solo admin
revoke execute on function restock_items(jsonb) from anon, public;
grant execute on function restock_items(jsonb) to authenticated;
