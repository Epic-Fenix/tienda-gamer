// Datos de abono de la tienda. Edita estos valores con tus cuentas reales.
// Los marcados como REEMPLAZAR son placeholders y deben actualizarse antes de publicar.
export const PAYMENT_INFO = {
    accountHolder: 'SCOTT GAMES',
    yapePlinNumber: '939719872',
    // Número de WhatsApp al que el cliente envía su comprobante (ventas/checkout).
    whatsapp: '+51 939 719 872',
    whatsappDigits: '51939719872',
    // Enlace directo de WhatsApp Business (sin texto prellenado).
    whatsappLink: 'https://wa.me/message/TEBDYEKCXWVZF1',
    bcp: '191-00000000-0-00', // REEMPLAZAR con tu número de cuenta BCP real
    bcpCci: '', // Opcional: CCI interbancario del BCP
    interbank: '000-0000000000', // REEMPLAZAR con tu número de cuenta Interbank real
    interbankCci: '', // Opcional: CCI interbancario de Interbank
};

// Formatea un monto en soles.
export const formatSoles = (n: number) =>
    n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Etiqueta legible del tipo de pago.
export const paymentTypeLabel = (isFullPayment: boolean) =>
    isFullPayment ? 'Liquidación Total (100%)' : 'Abono de Reserva';

// Construye el enlace de WhatsApp para enviar el comprobante con código, monto y tipo prellenados.
export function buildComprobanteWhatsappLink(orderCode: string, amount: number, isFullPayment = false) {
    const digits = PAYMENT_INFO.whatsappDigits;
    const concepto = isFullPayment ? 'la Liquidación Total (100%)' : 'el Abono de Reserva';
    const message =
        `¡Hola SCOTT GAMES! 👋 Adjunto mi comprobante de ${concepto} de la orden ` +
        `${orderCode} por S/. ${formatSoles(amount)}. Quedo atento(a) a la confirmación. ¡Gracias!`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}


// Ítem para el mensaje estructurado del pedido.
export interface PedidoItem {
    name: string;
    quantity: number;
    price: number;
    condition?: string | null;
}

// Etiqueta corta de condición para el mensaje de WhatsApp.
const shortCondition = (c?: string | null) => (c === 'segunda_mano' ? 'Seminuevo' : c ? 'Nuevo' : '');

// Construye el mensaje estructurado de "NUEVO PEDIDO" para enviar el comprobante.
export function buildPedidoWhatsappLink(params: {
    code: string;
    name: string;
    phone: string;
    deliveryLabel: string;
    items: PedidoItem[];
    total: number;
    separacion: number;
    isFullPayment?: boolean;
}) {
    const { code, name, phone, deliveryLabel, items, total, separacion, isFullPayment } = params;
    const lista = items
        .map((i) => {
            const cond = shortCondition(i.condition);
            const tag = cond ? ` (${cond})` : '';
            return `• ${i.quantity}x ${i.name}${tag} — S/. ${formatSoles(i.price * i.quantity)}`;
        })
        .join('\n');
    const montoLinea = isFullPayment
        ? `Pago total (100%): S/. ${formatSoles(separacion)}`
        : `Monto 20% separación: S/. ${formatSoles(separacion)}`;
    const msg =
        `🎮 *NUEVO PEDIDO - SCOTT GAMES LIMA*\n` +
        `Orden: #${code}\n` +
        `----------------------------------\n` +
        `Cliente: ${name || '—'} | Celular: ${phone || '—'}\n` +
        `Entrega: ${deliveryLabel}\n` +
        `Productos:\n${lista}\n` +
        `Total: S/. ${formatSoles(total)}\n` +
        `${montoLinea}\n` +
        `----------------------------------\n` +
        `Adjunto mi captura de pago de Yape/BCP para confirmar.`;
    return `https://wa.me/${PAYMENT_INFO.whatsappDigits}?text=${encodeURIComponent(msg)}`;
}
