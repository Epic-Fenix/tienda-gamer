# Arquitectura y documentación técnica — SCOTT GAMES

Documento de referencia: qué es el proyecto, qué se construyó, cómo está organizado y la lógica de negocio detrás. Complementa `MANUAL.md` (uso) y `AUDITORIA.md` (estado/pendientes).

---

## 1. Stack y despliegue

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (`strict`).
- **Estilos:** Tailwind CSS v4. Fuente gamer **Orbitron** (títulos/logo) + Geist (cuerpo).
- **Backend:** Supabase — Postgres (datos), Auth (admin), Storage (imágenes `product-images`), Realtime (actualización en vivo).
- **IA:** Google Gemini → OpenAI (fallback) → respuestas determinísticas, para el bot.
- **Correo:** Resend (aviso de pedido al dueño).
- **Deploy:** Vercel (auto-deploy al hacer push a `main`). URL: `tienda-gamer-tau.vercel.app`.
- **Repo:** GitHub `Epic-Fenix/tienda-gamer`.

## 2. Estructura del código

```
src/
  app/
    page.tsx                → carga StoreClient (tienda pública)
    StoreClient.tsx         → catálogo, hero/carrusel, filtros, grilla
    layout.tsx              → layout raíz + providers (carrito, bot, WhatsApp)
    admin/page.tsx          → panel de administración (auth + 4 pestañas)
    admin/reset-password/   → recuperación de contraseña
    order/[code]/page.tsx   → boleta del cliente (por código + token)
    api/
      chat-assistant/       → bot (Scotty Bot)
      cover-search/         → búsqueda de carátulas (Steam/RAWG)
      send-order-email/     → correo de pedido (Resend)
      izipay/               → esqueleto pasarela tarjeta (no activo)
  components/
    ProductCard, ProductQuickView, CartDrawer, ReservationModal,
    BackorderModal, GameRequestModal, TradeInModal, OrderTracker,
    PaymentInfo, SocialProofToasts, WhatsAppFab, GamerAiBot, LogoScott
    admin/ → BannerManager, CouponManager, TradeInManager,
             CoverSearch, PackingSlipModal
  context/CartContext.tsx   → estado del carrito (localStorage)
  lib/  → supabase, site (contacto/entrega/orderUrl/normalizePhone),
          payment (formatSoles/genOrderCode/IZIPAY), notify, orderStatus
  types/database.ts         → tipos (Product, Order, Coupon, ...)
```

Migraciones SQL (raíz, aplicadas en Supabase): `add_units_sold`, `add_is_epic`, `add_sell_items_rpc`, `security_rls`, `add_order_token` (+ seed/fixes históricos).

## 3. Secciones / módulos construidos

### Tienda (cliente)
- **Catálogo + filtros**: categorías (Todos, PS5, PS4, PS3, Nuevos, Switch, Xbox, Consolas, Coleccionables, Joyas Épicas, Seminuevos), géneros, rango de precio, "solo en stock", orden (recientes/precio) y paginación "ver más". Búsqueda + atajo Ctrl/Cmd+K.
- **Hero/carrusel**: banners (por defecto + promos fijas: "te lo buscamos", trueque, envío gratis) + banners dinámicos desde Supabase. Cinta de categorías con scroll oculto + flechas de escritorio.
- **Brand badges**: por plataforma con logo SVG + color de marca (PS5 blanco, PS4 azul, PS3 negro, Switch rojo, Xbox verde).
- **Ficha rápida** (QuickView) con deep-link `?p=slug`.
- **Carrito 2 pasos**: (1) revisar productos + barra de envío gratis; (2) datos, entrega, modalidad de pago, cupón, resumen y pago (Yape/Plin/transferencia/tarjeta-demo/WhatsApp).
- **Reserva/Separación** (`ReservationModal`): 100% o adelanto %.
- **Encargos** (`BackorderModal`): producto agotado → lista de espera.
- **Trueque** (`TradeInModal`) y **"Te lo buscamos"** (`GameRequestModal`).
- **Rastreo de pedido** (`OrderTracker`) por código o teléfono.
- **Boleta** (`/order/[code]?t=token`): comprobante con QR, datos de pago, estado.
- **Scotty Bot** 🎮: asistente de catálogo/envío/trueque/ubicación.

### Admin (`/admin`)
- **Inventario/Stock**: KPIs (Total en Stock, Inversión, Ganancia, Ganancia Neta, Dinero por Cobrar, Clientes en Espera); tabla con buscador/filtro/orden/paginación; acciones **Vender / +1 / −1 / ↩**; alta y edición de productos (con toggle **Joya Épica**); exportar CSV.
- **Banners & Hero**: CRUD de banners + cupones.
- **Reservas y Ventas**: pedidos, cambio de estado, etiqueta de envío (packing slip 10×15 con QR), boleta, verificar.
- **Backorders/Encargos** + solicitudes de trueque.

## 4. Modelo de datos (tablas Supabase)

- **products**: name, slug, category, platform, condition, price, `cost_price`, old_price, stock, `units_sold`, `is_epic`, min_reservation_pct, image_url, genre, discs...
- **orders**: order_code, `access_token`, customer_*, delivery_type, shipping_address, total/paid/pending_amount, is_full_payment, coupon_code, discount_amount, status, `items` (JSON), pickup_deadline.
- **backorders**: product_id, customer_*, status.
- **trade_ins**: customer_*, offered_item, wanted_item, status.
- **coupons**: code, discount_type, discount_value, is_active, max_uses, uses_count.
- **banners**: title, subtitle, image_url, button_text, link_url, target_product_slug, is_active, order_index.

## 5. Lógica de negocio (clave)

### Stock y ventas (RPC atómico)
- Al crear un pedido (carrito o reserva) se llama a **`sell_items(items)`** (RPC `security definer`): en un solo `UPDATE` hace `stock = stock - qty` y `units_sold = units_sold + qty`. Evita **sobreventa** por condición de carrera. Existe fallback no-atómico por compatibilidad.
- Botón admin **"🛒 Vender"** = venta en tienda física (mismo efecto, manual).
- Cancelar un pedido llama `sell_items` con `qty` negativo → **revierte** stock y ventas.
- ⚠️ Ver `AUDITORIA.md` B1-B3: hoy reserva web + "Vender" pueden **duplicar**, y "Cancelado" no está en el selector del panel (pendiente).

### Ganancia (KPIs)
- **Inversión** = Σ(costo × stock).
- **Ganancia Proyectada** = Σ((precio−costo) × stock) → potencial del stock.
- **Ganancia Realizada / Neta** = Σ((precio−costo) × units_sold) → lo ganado.
- **Ganancia (total)** = Realizada + Proyectada → **no baja al vender** (la ganancia se mueve de "potencial" a "ganada").
- Nota: hoy usan costo/precio **actuales** (sin snapshot histórico) — ver B4.

### Pedidos y montos
- Código único: `genOrderCode()` (timestamp base36 + aleatorio).
- Montos: total = subtotal − descuento + envío; adelanto = % o 100%; saldo = total − adelanto.
- Envío gratis desde `FREE_SHIPPING_THRESHOLD` (S/.300).
- Correo automático al dueño (Resend) y checkout/comprobante por WhatsApp.

### Seguridad (modelo)
- **RLS** por tabla: lectura pública de products/banners/coupons-activos; escritura solo autenticado; `orders` no legible por anon (solo insert).
- **RPCs public** controladas: `get_order(code, token)`, `search_orders(term)`, `use_coupon(code)`, `sell_items(items)`.
- **Token por pedido** (`access_token` UUID): la boleta exige código **+** token → enlaces no enumerables.
- **Admin**: Supabase Auth + allowlist `NEXT_PUBLIC_ADMIN_EMAILS` + signup desactivado.
- Secretos (Izipay/IA/Resend) solo en server; anon key pública (protegida por RLS).
- Pendientes de endurecimiento en `AUDITORIA.md` §A.

## 6. Variables de entorno

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ADMIN_EMAILS`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_IZIPAY_PUBLIC_KEY` (públicas) · `GEMINI_API_KEY`, `OPENAI_API_KEY`, `RAWG_API_KEY`, `RESEND_API_KEY`, `IZIPAY_SHOP_ID`, `IZIPAY_PASSWORD`, `IZIPAY_ENDPOINT` (server).

## 7. Flujos resumidos

**Compra web:** catálogo → carrito → paso 2 (datos/entrega/pago) → crea `order` + descuenta stock (`sell_items`) + correo → boleta con QR/token → cliente paga (Yape/Plin/transferencia) y envía comprobante por WhatsApp → dueño confirma estado en admin.

**Reserva:** ficha → "Separar %" → `order` (adelanto) + descuenta stock → boleta.

**Encargo (agotado):** "Encargar" → `backorder` → dueño avisa por WhatsApp al reingresar stock.

**Gestión dueño:** `/admin` → inventario (alta/edición/Vender/ajustes/Joya), ventas (estado/etiqueta/boleta), encargos, banners, cupones, KPIs, export CSV.

---

Ver también: `MANUAL.md` (guía de uso del dueño), `SECURITY.md` (seguridad), `IZIPAY_SETUP.md` (activar tarjeta), `AUDITORIA.md` (hallazgos y roadmap).
