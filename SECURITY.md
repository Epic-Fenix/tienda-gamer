# Seguridad — tienda-gamer

Estado: **RLS + token de boleta APLICADOS** en Supabase (`security_rls.sql`, `add_order_token.sql`,
`add_sell_items_rpc.sql`) y RPCs adoptadas en el código; signup desactivado; allowlist admin activa.
Quedan pendientes de endurecimiento los ítems de `AUDITORIA.md` §A (sell_items clamp, search_orders,
Storage policies, rate-limit, is_admin, headers). Ver ese archivo para el roadmap.

## 1. Riesgos por severidad

| # | Severidad | Riesgo | Estado |
|---|-----------|--------|--------|
| 1 | **CRÍTICA** | La `anon key` es pública. Si RLS está permisivo, cualquiera con la key (está en el bundle) puede **leer TODAS las órdenes** (nombre, teléfono, correo = datos personales), **borrar/editar productos**, cambiar precios/stock, leer cupones. | Pendiente: aplicar `security_rls.sql` |
| 2 | **Alta** | Rastreador de pedidos usa `ilike %término%` sobre `orders` (anon) → permite **enumerar** pedidos de otros clientes. | Se corrige con RPC `search_orders` (match exacto) + RLS |
| 3 | Media | Panel `/admin`: cualquier usuario **autenticado** de Supabase entraba (si el signup está abierto). | Mitigado: allowlist `NEXT_PUBLIC_ADMIN_EMAILS` + recomendación de desactivar signup |
| 4 | Media | `sell_items` debía saltar RLS para el descuento de stock anónimo. | Hecho: `security definer` |
| 5 | Baja | `innerHTML` en CoverSearch (antipatrón). | Corregido |
| 6 | Baja | Endpoints API sin rate-limit (`send-order-email`, `chat-assistant`, `cover-search`) → posible abuso/spam/costo. | Pendiente (opcional) |

## 2. Aplicado ya (código)
- Allowlist de admin por `NEXT_PUBLIC_ADMIN_EMAILS` (si vacío = comportamiento previo).
- `sell_items` como `security definer` (funciona con RLS activo).
- CoverSearch sin `innerHTML`.

## 3. Para cerrar la parte crítica (orden recomendado)
1. **Supabase → Authentication → Providers/Settings:** desactivar "Enable sign-ups" (que solo existan las cuentas admin que crees a mano).
2. **Vercel → Env:** definir `NEXT_PUBLIC_ADMIN_EMAILS` con el/los correos admin.
3. **Adoptar RPCs en el código** (para que sigan funcionando con RLS):
   - `order/[code]/page.tsx`: `supabase.rpc('get_order',{p_code:code})` en vez de `.from('orders').select().eq('order_code',code)`.
   - `OrderTracker.tsx`: `supabase.rpc('search_orders',{p_term:q})` en vez de `.from('orders').or(ilike...)`.
   - `CartDrawer.tsx`: `supabase.rpc('use_coupon',{p_code})` en vez de `.from('coupons').update(uses_count)`.
   - Nota: con RLS, el **realtime** de órdenes para clientes anónimos dejará de emitir (la boleta no se auto-actualiza en vivo). El admin (autenticado) sí. Trade-off aceptable por PII.
4. **Aplicar `security_rls.sql`** en Supabase (SQL Editor). Probar: crear pedido, ver boleta, rastrear, aplicar cupón, y que el admin siga operando.

## 4. Verificación post-RLS (checklist)
- [ ] Cliente crea pedido (carrito y reserva) → stock baja.
- [ ] Boleta `/order/CODE` carga (vía `get_order`).
- [ ] Rastreador encuentra por código y por teléfono exacto; NO por `%`.
- [ ] Cupón válido aplica y suma `uses_count`.
- [ ] Sin sesión: NO se puede leer la tabla `orders` completa (probar en consola con la anon key).
- [ ] Admin: inventario, ventas, KPIs, estados, banners, cupones OK.
