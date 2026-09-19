-- Token secreto por pedido: la boleta pública exige código + token (no enumerable).
alter table orders add column if not exists access_token uuid not null default gen_random_uuid();
update orders set access_token = gen_random_uuid() where access_token is null;

-- get_order ahora exige código + token; se elimina la versión solo-código.
drop function if exists get_order(text);
create or replace function get_order(p_code text, p_token uuid)
returns setof orders language sql security definer set search_path = public as $$
  select * from orders where order_code = p_code and access_token = p_token limit 1;
$$;
grant execute on function get_order(text, uuid) to anon, authenticated;
