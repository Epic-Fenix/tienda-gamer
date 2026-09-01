import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { CONTACT } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface EmailItem {
    name: string;
    quantity: number;
    price: number;
    condition?: string | null;
}

interface OrderEmailPayload {
    code: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    deliveryLabel: string;
    items: EmailItem[];
    total: number;
    paid: number;
    pending: number;
    isFullPayment?: boolean;
}

const soles = (n: number) =>
    (Number(n) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const shortCondition = (c?: string | null) => (c === 'segunda_mano' ? 'Seminuevo' : c ? 'Nuevo' : '');

function buildEmailHtml(o: OrderEmailPayload): string {
    const rows = o.items
        .map((it) => {
            const cond = shortCondition(it.condition);
            const tag = cond
                ? `<span style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:6px;background:#3e1b75;color:#c4b5fd;font-size:10px;font-weight:700;">${cond}</span>`
                : '';
            return `<tr>
                <td style="padding:8px 10px;border-bottom:1px solid #2a1352;color:#e9e2ff;font-size:13px;">
                    ${it.quantity}× ${it.name}${tag}
                </td>
                <td style="padding:8px 10px;border-bottom:1px solid #2a1352;color:#ffffff;font-size:13px;font-weight:700;text-align:right;white-space:nowrap;">
                    S/. ${soles(it.price * it.quantity)}
                </td>
            </tr>`;
        })
        .join('');

    const modalidad = o.isFullPayment ? 'Pago total (100%)' : 'Separación / Adelanto 20%';

    return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#0d0520;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0d0520;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92%;background:#13072b;border:1px solid #3e1b75;border-radius:16px;overflow:hidden;font-family:Segoe UI,Roboto,Arial,sans-serif;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(90deg,#2a1352,#3e1b75);padding:22px 24px;">
            <p style="margin:0;font-size:22px;font-weight:900;letter-spacing:1px;color:#ffffff;">🎮 SCOTT <span style="color:#fcd34d;">GAMES</span></p>
            <p style="margin:4px 0 0;font-size:12px;color:#c4b5fd;">Nuevo pedido registrado · ${CONTACT.location}</p>
          </td>
        </tr>
        <!-- Código -->
        <tr>
          <td style="padding:20px 24px 8px;">
            <p style="margin:0;font-size:12px;color:#8a72b8;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Código de orden</p>
            <p style="margin:2px 0 0;font-size:26px;font-weight:900;color:#2dd4bf;font-family:monospace;">#${o.code}</p>
          </td>
        </tr>
        <!-- Cliente -->
        <tr>
          <td style="padding:8px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1e0d3b;border:1px solid #3e1b75;border-radius:12px;">
              <tr><td style="padding:12px 14px;color:#c4b5fd;font-size:13px;">
                <strong style="color:#ffffff;">Cliente:</strong> ${o.customerName || '—'}<br/>
                <strong style="color:#ffffff;">Celular:</strong> ${o.customerPhone || '—'}${o.customerEmail ? `<br/><strong style="color:#ffffff;">Correo:</strong> ${o.customerEmail}` : ''}<br/>
                <strong style="color:#ffffff;">Entrega:</strong> ${o.deliveryLabel}
              </td></tr>
            </table>
          </td>
        </tr>
        <!-- Productos -->
        <tr>
          <td style="padding:14px 24px 4px;">
            <p style="margin:0 0 6px;font-size:12px;color:#8a72b8;text-transform:uppercase;letter-spacing:1px;font-weight:700;">Productos</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1e0d3b;border:1px solid #3e1b75;border-radius:12px;overflow:hidden;">
              ${rows}
            </table>
          </td>
        </tr>
        <!-- Totales -->
        <tr>
          <td style="padding:12px 24px 22px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
              <tr><td style="padding:4px 0;color:#c4b5fd;">Modalidad</td><td style="padding:4px 0;color:#ffffff;text-align:right;font-weight:700;">${modalidad}</td></tr>
              <tr><td style="padding:4px 0;color:#c4b5fd;">Total</td><td style="padding:4px 0;color:#ffffff;text-align:right;font-weight:700;">S/. ${soles(o.total)}</td></tr>
              <tr><td style="padding:4px 0;color:#34d399;">${o.isFullPayment ? 'Pagado' : 'Adelanto (20%)'}</td><td style="padding:4px 0;color:#34d399;text-align:right;font-weight:800;">S/. ${soles(o.paid)}</td></tr>
              <tr><td style="padding:4px 0;color:#fcd34d;">Saldo pendiente</td><td style="padding:4px 0;color:#fcd34d;text-align:right;font-weight:800;">S/. ${soles(o.pending)}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#1e0d3b;padding:14px 24px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#8a72b8;">Este correo se generó automáticamente al registrarse la reserva en la tienda web.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(request: Request) {
    const apiKey = process.env.RESEND_API_KEY;
    // Si no hay API key configurada, no rompemos el flujo de compra.
    if (!apiKey) {
        return NextResponse.json(
            { ok: false, skipped: true, reason: 'RESEND_API_KEY no configurada' },
            { status: 200 }
        );
    }

    let payload: OrderEmailPayload;
    try {
        payload = (await request.json()) as OrderEmailPayload;
    } catch {
        return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 });
    }

    if (!payload?.code) {
        return NextResponse.json({ ok: false, error: 'Falta el código de orden' }, { status: 400 });
    }

    try {
        const resend = new Resend(apiKey);
        // `from` requiere un dominio verificado en Resend. Mientras tanto,
        // onboarding@resend.dev permite enviar al correo del dueño de la cuenta.
        const from = process.env.RESEND_FROM || 'SCOTT GAMES <onboarding@resend.dev>';
        const { data, error } = await resend.emails.send({
            from,
            to: [CONTACT.email],
            replyTo: payload.customerEmail || undefined,
            subject: `🎮 Nuevo pedido #${payload.code} — S/. ${soles(payload.total)}`,
            html: buildEmailHtml(payload),
        });

        if (error) {
            console.error('[send-order-email] Resend error:', error);
            return NextResponse.json({ ok: false, error: error.message }, { status: 502 });
        }
        return NextResponse.json({ ok: true, id: data?.id });
    } catch (err) {
        console.error('[send-order-email] Error:', err);
        const message = err instanceof Error ? err.message : 'Error desconocido';
        return NextResponse.json({ ok: false, error: message }, { status: 500 });
    }
}
