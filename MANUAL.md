# Manual de uso — SCOTT GAMES

Guía para el dueño. La tienda vive en **https://tienda-gamer-tau.vercel.app** y el panel de administración en **/admin**.

---

## 1. Entrar al panel

1. Abre `tienda-gamer-tau.vercel.app/admin`.
2. Inicia sesión con tu correo y contraseña autorizados.
3. Si olvidaste la contraseña: "¿Olvidaste tu contraseña?" → te llega un enlace por correo.
4. Solo los correos configurados pueden entrar. No compartas tus credenciales.

El panel tiene 4 pestañas: **Inventario / Stock**, **Banners & Hero**, **Reservas y Ventas**, **Backorders / Encargos**.

---

## 2. Inventario / Stock

### Tarjetas (arriba)
- **Total en Stock**: unidades en almacén.
- **Inversión**: cuánto te costó la mercadería que tienes hoy.
- **Ganancia**: total (ganada + potencial). **No baja al vender** — solo cambia de "potencial" a "ganada".
- **Ganancia Neta**: lo que ya ganaste con lo vendido.
- **Dinero por Cobrar**: saldos de reservas activas.
- **Clientes en Espera**: encargos pendientes.

### Agregar un producto
1. Botón **+ Nuevo Producto**.
2. Llena nombre, categoría, plataforma, **costo** (lo que te costó), **precio** (venta), stock, % de separación, imagen.
3. Marca **💎 Joya Épica** si es un juego raro/destacado (aparece con badge y en el filtro "Joyas Épicas").
4. Guardar.
> Tip: para la imagen puedes usar el buscador de carátulas.

### Vender / ajustar stock (columna "Venta / Stock")
- **🛒 Vender**: registra una venta en tienda física → baja 1 de stock y suma a la ganancia. Úsalo para ventas presenciales.
- **+1**: ingresas stock nuevo (sin venta).
- **−1**: quitas stock por merma/ajuste (sin venta).
- **↩**: deshace la última venta (corrige y devuelve el stock).
> Importante: las ventas por la **web** (carrito/reserva) ya descuentan stock y suman ganancia **solas**. NO uses "🛒 Vender" para esos pedidos (duplicarías). "Vender" es solo para ventas en el mostrador.

### Buscar / filtrar / ordenar
Arriba de la tabla: buscador por nombre/categoría, filtro por estado (Nuevo/Seminuevo), y "Ordenar" (stock, más vendidos, nombre, precio). La tabla se pagina de 10 en 10.

### Reportes
Botón **Exportar Inventario (CSV)** y **Exportar Reservas/Ventas (CSV)** para abrir en Excel.

---

## 3. Reservas y Ventas

Lista de pedidos (web y reservas). Por cada uno:
- **Estado** (menú): Pendiente → Confirmado → En preparación → Listo → **Entregado**. Cámbialo según avanza.
  - Si marcas **Cancelado**, el sistema **devuelve el stock** automáticamente.
- **🧾 Boleta ↗**: abre el comprobante del cliente (con su enlace seguro).
- **Etiqueta**: imprime la etiqueta de envío 10×15 cm (con QR).
- **Verificar →**: resumen rápido del pedido.

---

## 4. Encargos (Backorders) y Trueque

- **Backorders / Encargos**: cuando un cliente pide un producto agotado, aparece aquí. Contáctalo por **WhatsApp** (botón) cuando llegue stock; marca **Notificado** / **Completado**.
- **Solicitudes de Trueque**: cotizaciones de canje. Contacta por WhatsApp; marca **Contactado** / **Cerrar**.
- **"¿Buscas un juego?"** (banner): el cliente llena qué juego busca, consola y cuánto pagaría → te llega por WhatsApp.

---

## 5. Banners y Cupones (pestaña Banners & Hero)

- **Banners del carrusel**: agrega/edita los banners grandes de la portada (título, subtítulo, imagen, enlace).
- **Cupones**: crea códigos de descuento (porcentaje o monto), con límite de usos opcional. El cliente lo aplica en el carrito.

---

## 6. Cómo compra el cliente (para que sepas explicarlo)

1. Agrega productos al **carrito**.
2. Paso 1 (Carrito): revisa productos → **Continuar al pago**.
3. Paso 2 (Datos y pago): elige entrega (recojo/domicilio/provincia), modalidad (pago total o separación 20%), cupón, datos.
4. Paga por: **Yape/Plin** (número o QR), **transferencia**, o **tarjeta** (demo por ahora), y envía su comprobante por WhatsApp.
5. Recibe su **boleta** con código y **QR**. Ese QR lo muestra en tienda para recoger/verificar su pedido.
6. Puede **rastrear** su pedido desde "Rastrear Pedido" (por código o WhatsApp).

**Scotty Bot** 🎮 (abajo a la derecha) responde dudas de clientes (precios, stock, envío, trueque, ubicación).

---

## 7. Seguridad (importante)

- El acceso a `/admin` está limitado a tus correos. No los compartas.
- Los datos de los clientes (órdenes) están protegidos: nadie puede verlos sin ser admin.
- La boleta de cada cliente usa un **enlace secreto** (código + token). Nadie puede adivinar boletas ajenas.

---

## 8. Pendientes / configuración futura

- **RUC y cuentas BCP/Interbank**: hoy están ocultos hasta cargar los reales (en `src/lib/payment.ts` / boleta).
- **Dominio propio** (ej. scottgames.pe): se conecta en Vercel cuando lo compres.
- **Pasarela de tarjeta (Izipay)**: preparada; falta cuenta + llaves para cobro real (ver `IZIPAY_SETUP.md`).

---

## 9. Migraciones de base de datos (referencia técnica)

Scripts SQL aplicados en Supabase (SQL Editor):
- `add_units_sold.sql` — columna de unidades vendidas.
- `add_is_epic.sql` — marca de Joya Épica.
- `add_sell_items_rpc.sql` — venta atómica (sin sobreventa).
- `security_rls.sql` — reglas de seguridad + funciones públicas.
- `add_order_token.sql` — token secreto por pedido.

Detalle de seguridad en `SECURITY.md`.
