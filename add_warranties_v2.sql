-- Garantía v2: quitar DNI, agregar fecha de compra y foto de la tarjeta.

-- 1) Nuevas columnas.
alter table warranties add column if not exists purchase_date date;
alter table warranties add column if not exists card_image_url text;

-- 2) Quitar DNI y su índice único.
drop index if exists warranties_dni_product_uidx;
alter table warranties drop column if exists dni;

-- 3) Anti-duplicado por celular + producto (reemplaza al de DNI).
create unique index if not exists warranties_phone_product_uidx
  on warranties (customer_phone, coalesce(product, ''));

-- 4) Bucket público para las fotos de tarjetas de garantía.
insert into storage.buckets (id, name, public)
values ('warranty-cards', 'warranty-cards', true)
on conflict (id) do nothing;

-- 5) Políticas del bucket: cualquiera sube (cliente) y lee (bucket público). Solo admin borra.
drop policy if exists warranty_cards_insert on storage.objects;
create policy warranty_cards_insert on storage.objects for insert
  to anon, authenticated with check (bucket_id = 'warranty-cards');

drop policy if exists warranty_cards_read on storage.objects;
create policy warranty_cards_read on storage.objects for select
  using (bucket_id = 'warranty-cards');

drop policy if exists warranty_cards_delete on storage.objects;
create policy warranty_cards_delete on storage.objects for delete
  using (bucket_id = 'warranty-cards' and is_admin());
