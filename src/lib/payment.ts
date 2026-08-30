// Datos de abono de la tienda. Edita estos valores con tus cuentas reales.
// Los marcados como REEMPLAZAR son placeholders y deben actualizarse antes de publicar.
export const PAYMENT_INFO = {
    accountHolder: 'Carlos Chafloque',
    yapePlinNumber: '93979872',
    // Número de WhatsApp al que el cliente envía su comprobante.
    whatsapp: '+51 93979872',
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
    const digits = PAYMENT_INFO.whatsapp.replace(/\D/g, '');
    const concepto = isFullPayment ? 'la Liquidación Total (100%)' : 'el Abono de Reserva';
    const message =
        `¡Hola Tienda Gamer! 👋 Adjunto mi comprobante de ${concepto} de la orden ` +
        `${orderCode} por S/. ${formatSoles(amount)}. Quedo atento(a) a la confirmación. ¡Gracias!`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
