import { NextRequest, NextResponse } from 'next/server';

// Crea el "formToken" de Izipay para renderizar el formulario de pago embebido.
// Requiere credenciales de comercio (Settings de Izipay). Sin ellas responde 501.
//
// Variables de entorno (servidor, NO usar NEXT_PUBLIC para el secreto):
//   IZIPAY_SHOP_ID   -> usuario / shopId
//   IZIPAY_PASSWORD  -> password (secreto)
//   IZIPAY_ENDPOINT  -> ej. https://api.micuentaweb.pe
// Frontend:
//   NEXT_PUBLIC_IZIPAY_PUBLIC_KEY -> clave pública (activa el botón)

export async function POST(req: NextRequest) {
    const shopId = process.env.IZIPAY_SHOP_ID;
    const password = process.env.IZIPAY_PASSWORD;
    const endpoint = process.env.IZIPAY_ENDPOINT || 'https://api.micuentaweb.pe';

    if (!shopId || !password) {
        return NextResponse.json(
            { error: 'Izipay no configurado: falta IZIPAY_SHOP_ID / IZIPAY_PASSWORD.' },
            { status: 501 }
        );
    }

    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount); // en soles
    const orderId = String(body.orderId || '');
    const email = String(body.email || 'cliente@scottgames.pe');

    if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Monto inválido.' }, { status: 400 });
    }

    // Izipay espera el monto en céntimos.
    const auth = Buffer.from(`${shopId}:${password}`).toString('base64');
    const resp = await fetch(`${endpoint}/api-payment/V4/Charge/CreatePayment`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            amount: Math.round(amount * 100),
            currency: 'PEN',
            orderId,
            customer: { email },
        }),
    });

    const data = await resp.json().catch(() => null);
    const formToken = data?.answer?.formToken;
    if (!resp.ok || !formToken) {
        return NextResponse.json({ error: 'Izipay: no se pudo crear el pago.', detail: data }, { status: 502 });
    }
    return NextResponse.json({ formToken });
}
