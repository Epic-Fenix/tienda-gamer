// Notificación por correo del pedido (fire-and-forget).
// Nunca bloquea ni interrumpe el flujo de compra si el correo falla.

export interface OrderEmailInput {
    code: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    deliveryLabel: string;
    items: { name: string; quantity: number; price: number; condition?: string | null }[];
    total: number;
    paid: number;
    pending: number;
    isFullPayment?: boolean;
}

export function notifyOrderByEmail(input: OrderEmailInput): void {
    try {
        void fetch('/api/send-order-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
            keepalive: true,
        }).catch(() => {
            /* silencioso: la venta ya se registró en Supabase */
        });
    } catch {
        /* noop */
    }
}
