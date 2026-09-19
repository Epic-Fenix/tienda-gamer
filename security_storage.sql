-- Seguridad del bucket de imágenes de productos/banners.
-- Objetivo: lectura pública, ESCRITURA solo para usuarios autenticados (admin).
-- ⚠️ Ajusta el nombre del bucket si no es 'product-images'.
-- ⚠️ ANTES de aplicar: en Supabase → Storage → Policies, ELIMINA cualquier policy
--    existente que permita insert/update/delete a 'anon' o 'public' en ese bucket.

-- RLS de storage.objects ya viene activado por Supabase.

-- Lectura pública (para mostrar las imágenes en la tienda)
create policy "product_images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Subir: solo autenticado
create policy "product_images_auth_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images');

-- Reemplazar: solo autenticado
create policy "product_images_auth_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images');

-- Borrar: solo autenticado
create policy "product_images_auth_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images');
