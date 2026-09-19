# Auditoría integral — SCOTT GAMES (tienda-gamer)

Fecha: 2026-09-19 · Stack: Next.js 16 / React 19 / Supabase (Postgres + Auth + Storage) · Deploy: Vercel.
Resultado de dos auditorías profundas (seguridad + calidad/completitud). Estado actual: **RLS y token de boleta YA aplicados** en Supabase; signup de usuarios **desactivado**; allowlist de admin activa.

---

## Resumen ejecutivo

La tienda es **funcional y sólida** para operación pequeña. La base de seguridad está bien pensada (RLS, RPCs security-definer, token por pedido, secretos server-only, headers básicos). Quedan **huecos explotables con la anon key** (que es pública) y **inconsistencias de lógica de negocio** en el conteo de ventas/ganancia. No usar con **pago con tarjeta real** ni **alto volumen** hasta cerrar los ítems Alta.

Veredicto: **apta para lanzar como tienda chica** tras cerrar Críticos/Altos de seguridad (1-3) y el doble conteo de inventario. **No** apta aún para datos a gran escala / tarjeta sin las mejoras 4-10.

---

## A. Seguridad

### 🔴 Crítico / Alto (explotable con anon key, sin ser admin)
| # | Hallazgo | Archivo | Fix |
|---|----------|---------|-----|
| S1 | **`sell_items` acepta `qty` arbitrario** desde `anon` (sin auth, sin límites). `qty` negativo infla stock; positivo gigante corrompe stock/`units_sold`/ganancias. | `add_sell_items_rpc.sql:4-21` | Validar `qty between 1 and N`; sin negativos desde anon; idealmente mover a un RPC `create_order` y `revoke ... from anon`. |
| S2 | **`search_orders` devuelve todas las columnas** (incluye `access_token`, correo, dirección). Adivinando un teléfono (9 díg.) → PII + token del cliente. | `security_rls.sql:60-67` | Devolver solo columnas no sensibles (código, estado, montos); exigir código + teléfono; nunca `access_token`. |
| S3 | **Storage `product-images` sin policy en el repo**: si permite `anon`, cualquiera sube/borra archivos bajo tu dominio. | `admin/page.tsx:283`, `BannerManager.tsx:31` | Crear policies: lectura pública, insert/delete solo admin; verificar en el panel que no haya insert para anon; validar tipo/tamaño. |

### 🟡 Medio
| # | Hallazgo | Fix |
|---|----------|-----|
| S4 | **`send-order-email` abierto** (spam al dueño) + campos del cliente **sin escapar** en el HTML del correo (inyección/phishing). | Rate-limit + escapar/validar payload. |
| S5 | **Autorización = "cualquier logueado"** (`auth.role()='authenticated'`), no "admin". Mitigado porque signup está off (solo 2 cuentas). | Tabla `admin_users` + función `is_admin()`; usarla en todas las policies de escritura y en select/update/delete de `orders`. |
| S6 | **Sin rate-limit** en `chat-assistant`, `send-order-email`, `cover-search`, y RPCs públicos → abuso de cuota (IA/Resend/RAWG) y DoS de cupones. | Rate-limit por IP (middleware / edge). |
| S7 | **Headers** faltan `CSP`, `HSTS`, `Permissions-Policy`. | Añadir en `next.config.ts` (CSP report-only al inicio). |
| S8 | **`access_token` en query string** (`?t=`) → queda en historial/logs/Referer. | Usar fragmento `#t=` o `Referrer-Policy: no-referrer` en la boleta; quitar el fallback sin-token (`order/[code]/page.tsx:26-29`, ya innecesario con RLS). |
| S9 | **Izipay (antes de activar):** `amount` viene del cliente; sin webhook/firma. | Derivar `amount` del pedido en server; webhook con validación de firma; auth. |

### 🟢 OK / bien resuelto
Secretos solo server (Izipay/Gemini/OpenAI/RAWG/Resend); `.env.local` gitignoreado; anon key pública por diseño; `sell_items` atómico (sin sobreventa); token de boleta con buena entropía (`crypto.randomUUID`); RLS y token aplicados; `strict:true`, cero `any`; canales realtime se limpian.

---

## B. Lógica de negocio / consistencia de datos

| # | Severidad | Hallazgo | Detalle |
|---|-----------|----------|---------|
| B1 | **Alta** | **Doble conteo de ventas** | La reserva/carrito web ya hace `stock-1` + `units_sold+1`. El botón admin **"🛒 Vender"** vuelve a hacerlo. Si el dueño registra en el panel una venta que también entró por web → se descuenta **dos veces**. |
| B2 | **Alta** | **El admin no puede cancelar desde el panel** | La reversión de stock se dispara con `status==='cancelled'` (`admin/page.tsx:246`), pero el selector de estados (`orderStatus.ts`) **no incluye** "cancelado". → El stock nunca se revierte desde la UI. |
| B3 | **Alta** | **Reserva no pagada = ganancia realizada** | `units_sold` sube al crear la reserva (aun con solo 20%). "Ganancia Neta" la cuenta como ganada aunque el cliente nunca complete. |
| B4 | **Media** | **KPIs sin snapshot de costo** | `realizedProfit`/`salesRevenue` usan `cost_price`/`price` **actuales** del producto, no el histórico de la venta. Cambiar precio/costo reescribe la ganancia pasada. La orden guarda `items[].price` pero el cálculo lo ignora. |
| B5 | **Media** | **Cupón fuera de la ganancia** | El descuento se aplica al cobro, pero `units_sold`/ingresos se calculan a precio de lista → sobreestima ingresos. |
| B6 | **Baja** | **Envío gratis sobre subtotal bruto** | `shippingCost(deliveryType, total)` usa `total` sin descuento; un cupón puede dar envío gratis bajo S/.300 real. |

> **Recomendación central (B1-B3):** una sola fuente de verdad. "Reservado" ≠ "vendido". Que `units_sold`/ganancia se muevan al **confirmar pago/entrega**, no al crear la orden; vincular el ajuste de stock a `orders`; agregar "Cancelado" al selector de estados (dispara la reversión ya implementada).

---

## C. Calidad de código

- **Alta — `admin/page.tsx` (1214 líneas)**: monolito con auth + inventario + KPIs + 2 modales (crear/editar producto casi idénticos) + órdenes + backorders. Dividir en `AdminAuthGate`, `ProductFormModal` (unificado), `InventoryTab`, `OrdersTab`, `KpiCards`.
- **Alta — `api/izipay/route.ts` código muerto**: nunca se invoca; el pago con tarjeta es `setTimeout` simulado. Borrar la ruta + form demo, o cablear de verdad.
- **Media — duplicación**: flujo de orden (genOrderCode+token+insert+`sell_items`+fallback+email) repetido en `ReservationModal` y `CartDrawer` → helper `createOrder()`. SVG de WhatsApp inline en 6 archivos. `shortCondition`/`conditionLabel` duplicados.
- **Media — tipos vs BD**: `OrderStatus` no refleja los estados reales (`pending/confirmed/preparing/ready/delivered`); `condition: string` en vez de `Condition`. Clasificación por regex sobre texto libre (`StoreClient`) es frágil.
- **Media — manejo de errores**: `fetchData` (admin) y varias lecturas ignoran `error` de Supabase → "sin datos" silencioso. 21 `alert()` bloqueantes; sin toasts. Sin estado de error diferenciado en tienda/boleta.
- **Baja — campos/params muertos**: `Product.barcode`, `allow_reservation` (se escribe, no se lee), `pendingTotal` del context sin usar, `buildComprobanteWhatsappLink` fallback inalcanzable.
- **Positivo**: `strict:true`, cero `any`, realtime bien limpiado.

## D. Rendimiento

- **Media — admin trae TODAS las órdenes** sin límite (para KPI "por cobrar"); y el realtime hace **refetch total** por cada cambio. Paginar + KPIs por agregado en BD.
- **Media — imágenes con `<img>`** (no `next/image`), sin optimización/resize → LCP y ancho de banda altos (carátulas Steam/Supabase).
- **Baja** — sin virtualización (ok por "ver más" + paginación); N+1 acotado en cover-search.

## E. Accesibilidad / SEO

- **Alta — `layout.tsx lang="en"`** en un sitio en español → rompe lectores/SEO. Cambiar a `es`.
- **Alta — SEO mínimo**: sin `metadataBase`, `openGraph`/`twitter` (no hay preview al compartir en WhatsApp/Facebook, del que vive la tienda), sin `sitemap.ts`/`robots.ts`.
- **Media** — sin `not-found.tsx`/`error.tsx`/`loading.tsx`; labels/aria incompletos en varios inputs/botones-emoji.

## F. Qué falta para producción (checklist)
- [ ] Tests de lógica de dinero (`payment.ts`, totales/descuentos/envío) y `sell_items`/reversión.
- [ ] CI (lint + build) en `.github/workflows`.
- [ ] Monitoreo de errores (Sentry) — hoy los `console.error` se pierden.
- [ ] Validación de env vars al arrancar (`supabase.ts` cae a `''` silencioso).
- [ ] Migraciones ordenadas/versionadas (`supabase/migrations`); garantizar RPCs y quitar los "fallback si el RPC no existe".
- [ ] Política de privacidad + términos (Ley 29733 Perú, datos personales) y consentimiento del correo.
- [ ] Analítica (GA4 / Meta Pixel).
- [ ] SEO: `lang="es"`, Open Graph, sitemap, robots.
- [ ] Páginas 404 / 500 / loading.
- [ ] `next/image` + dominios de imagen configurados.
- [ ] Paginación/límites en lecturas admin.
- [ ] Estados de error/carga/vacío diferenciados.
- [ ] Pago con tarjeta real (Izipay) o retirar el demo.
- [ ] Backups de BD (plan Supabase).
- [ ] Reemplazar `alert()`/`confirm()` por toasts.

---

## Roadmap priorizado (qué hacer y en qué orden)

**Fase 1 — Seguridad crítica (rápido, cierra lo explotable):** S1 (`sell_items` clamp), S2 (`search_orders` columnas), S3 (Storage policies).
**Fase 2 — Lógica de negocio:** B1/B2/B3 (fuente de verdad de ventas + estado "Cancelado" + no contar reservas como ganancia).
**Fase 3 — Hardening:** S4-S8 (email escape/rate-limit, `is_admin()`, headers, token fuera de la URL).
**Fase 4 — Producción:** SEO/i18n (E), env validation + error handling (C/F), `next/image` (D), páginas de error, migraciones ordenadas, tests + CI.
**Fase 5 — Negocio:** Izipay real (S9), analítica, legales, dominio propio.
