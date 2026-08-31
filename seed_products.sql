-- =====================================================================
-- SCOTT GAMES · Seed / actualización de catálogo
-- Ejecuta este script en Supabase → SQL Editor.
-- Es idempotente: puedes correrlo varias veces (hace upsert por slug).
-- Las carátulas de juegos con versión en Steam usan el póster vertical
-- oficial 600x900. Los ítems sin URL (Switch, consolas, accesorios, Funko)
-- quedan sin imagen: complétalos desde /admin con "🔍 Buscar Carátula HD"
-- o subiendo la foto real de tu stock.
-- =====================================================================

-- Columna de precio anterior (para badges de descuento). Segura de re-ejecutar.
alter table public.products add column if not exists old_price numeric;

-- Índice único por slug (necesario para el upsert). Falla solo si ya
-- existen slugs duplicados; en ese caso limpia los duplicados primero.
create unique index if not exists products_slug_unique on public.products (slug);

insert into public.products
  (name, slug, description, category, platform, condition, price, old_price, stock, allow_reservation, min_reservation_pct, image_url)
values
  ('Marvel''s Spider-Man 2', 'spider-man-2-ps5',
   'Peter y Miles enfrentan a Venom en la secuela definitiva de PS5.',
   'Juegos', 'PS5', 'nuevo', 269.00, 319.00, 10, true, 20,
   'https://cdn.cloudflare.steamstatic.com/steam/apps/2651280/library_600x900.jpg'),

  ('Grand Theft Auto V', 'gta-v-ps5',
   'El clásico de Rockstar en su versión de nueva generación.',
   'Juegos', 'PS5', 'segunda_mano', 119.00, 159.00, 3, true, 20,
   'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/library_600x900.jpg'),

  ('Elden Ring: Shadow of the Erdtree Edition', 'elden-ring-sote-ps5',
   'El aclamado RPG de acción de FromSoftware con la expansión incluida.',
   'Juegos', 'PS5', 'nuevo', 289.00, 329.00, 8, true, 20,
   'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_600x900.jpg'),

  ('God of War Ragnarök', 'god-of-war-ragnarok-ps5',
   'Kratos y Atreus en su épica travesía por los nueve reinos.',
   'Juegos', 'PS5', 'nuevo', 249.00, 299.00, 9, true, 20,
   'https://cdn.cloudflare.steamstatic.com/steam/apps/2322010/library_600x900.jpg'),

  ('Super Mario Bros. Wonder', 'super-mario-bros-wonder-switch',
   'La nueva aventura 2D de Mario llena de sorpresas maravillosas.',
   'Juegos', 'Nintendo Switch', 'nuevo', 229.00, null, 10, true, 20, null),

  ('The Legend of Zelda: Tears of the Kingdom', 'zelda-tears-of-the-kingdom-switch',
   'Explora Hyrule por tierra y cielo en esta obra maestra de aventura.',
   'Juegos', 'Nintendo Switch', 'nuevo', 249.00, null, 8, true, 20, null),

  ('Mario Kart 8 Deluxe', 'mario-kart-8-deluxe-switch',
   'El mejor party-racer con todos los circuitos y personajes.',
   'Juegos', 'Nintendo Switch', 'segunda_mano', 189.00, 219.00, 3, true, 20, null),

  ('Halo Infinite', 'halo-infinite-xbox',
   'El regreso del Jefe Maestro con campaña y multijugador.',
   'Juegos', 'Xbox', 'nuevo', 159.00, null, 12, true, 20,
   'https://cdn.cloudflare.steamstatic.com/steam/apps/1240440/library_600x900.jpg'),

  ('Forza Horizon 5', 'forza-horizon-5-xbox',
   'Conducción en mundo abierto por los paisajes de México.',
   'Juegos', 'Xbox', 'nuevo', 219.00, 259.00, 9, true, 20,
   'https://cdn.cloudflare.steamstatic.com/steam/apps/1551360/library_600x900.jpg'),

  ('Consola PlayStation 5 Slim con Lector', 'consola-ps5-slim-lector',
   'PS5 Slim edición con lector de discos. Incluye 1 mando DualSense.',
   'Consolas', 'PS5', 'nuevo', 2499.00, null, 4, true, 20, null),

  ('Nintendo Switch OLED - Edición Blanca', 'nintendo-switch-oled-blanca',
   'Pantalla OLED de 7", base con LAN y Joy-Con blancos.',
   'Consolas', 'Nintendo Switch', 'nuevo', 1499.00, null, 4, true, 20, null),

  ('Mando DualSense PS5 Midnight Black', 'mando-dualsense-midnight-black',
   'Control inalámbrico DualSense con retroalimentación háptica.',
   'Accesorios', 'PS5', 'nuevo', 289.00, null, 6, true, 20, null),

  ('Mando Inalámbrico Xbox Robot White', 'mando-xbox-robot-white',
   'Control inalámbrico Xbox con agarre texturizado y botón compartir.',
   'Accesorios', 'Xbox', 'nuevo', 259.00, null, 6, true, 20, null),

  ('Figura Funko Pop! Goku Ultra Instinto', 'funko-goku-ultra-instinto',
   'Figura coleccionable de Goku en su forma Ultra Instinto.',
   'Coleccionables', 'Coleccionables', 'nuevo', 79.00, null, 10, true, 20, null)

on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  platform = excluded.platform,
  condition = excluded.condition,
  price = excluded.price,
  old_price = excluded.old_price,
  stock = excluded.stock,
  allow_reservation = excluded.allow_reservation,
  min_reservation_pct = excluded.min_reservation_pct,
  -- Mantiene la imagen ya cargada si el seed trae NULL:
  image_url = coalesce(excluded.image_url, public.products.image_url);
