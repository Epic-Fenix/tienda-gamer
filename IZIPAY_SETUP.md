# Activar pasarela Izipay

El backend ya está preparado (`src/app/api/izipay/route.ts` + `IZIPAY` en `src/lib/payment.ts`).
Para cobrar con tarjeta solo falta cargar las credenciales y montar el formulario.

## 1. Requisitos previos
- Cuenta de comercio Izipay aprobada (normalmente con **RUC**).
- Desde el panel de Izipay obtener:
  - **Shop ID** (usuario)
  - **Password** (clave secreta REST)
  - **Clave pública** (client / public key)
  - Endpoint (ej. `https://api.micuentaweb.pe`)

## 2. Variables de entorno
En Vercel → Project → Settings → Environment Variables (y en `.env.local` para desarrollo):

```
IZIPAY_SHOP_ID=xxxxxxxx
IZIPAY_PASSWORD=xxxxxxxxxxxxxxxx        # SECRETO, solo servidor
IZIPAY_ENDPOINT=https://api.micuentaweb.pe
NEXT_PUBLIC_IZIPAY_PUBLIC_KEY=xxxxxxxx  # activa el botón en el checkout
```

Al existir `NEXT_PUBLIC_IZIPAY_PUBLIC_KEY`, `IZIPAY.enabled` pasa a `true`.

## 3. Falta (trabajo final, ~medio día)
- Botón "Pagar con tarjeta (Izipay)" en `CartDrawer` (renderizar solo si `IZIPAY.enabled`).
- Llamar a `POST /api/izipay` con `{ amount, orderId, email }` → recibir `formToken`.
- Montar el formulario embebido de Izipay (librería Krypton / `KR.js`) con `publicKey` + `formToken`.
- Webhook de confirmación para marcar la orden como pagada automáticamente.

## Notas
- El secreto (`IZIPAY_PASSWORD`) nunca debe ir en variables `NEXT_PUBLIC_*`.
- Comisión aprox. 3.5–4% + IGV por transacción.
