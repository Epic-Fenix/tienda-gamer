// URL pública del sitio (usada para construir enlaces en los códigos QR).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tienda-gamer-tau.vercel.app';

// Enlace a la boleta/orden de un pedido.
export const orderUrl = (code: string) => `${SITE_URL}/order/${code}`;

// Datos corporativos de la tienda.
export const STORE = {
    name: 'SCOTT GAMES',
    address: 'Av. Juan Velazco Alvarado 805, Lima - Perú',
    ruc: '', // Coloca aquí tu RUC real para mostrarlo en la boleta
};

// =====================================================================
// Opciones de tipo de entrega (compartidas por carrito, reserva, boleta).
// Fuente única de verdad para mantener consistencia en toda la app.
// =====================================================================
export type DeliveryValue = 'feria_grau' | 'domicilio' | 'provincia';

export const DELIVERY_OPTIONS: { value: DeliveryValue; label: string }[] = [
    { value: 'feria_grau', label: '🏬 Recojo en Feria Grau' },
    { value: 'domicilio', label: '🚚 Envío a Domicilio (+ costo de envío)' },
    { value: 'provincia', label: '📦 Envío a Provincia (+ costo de envío)' },
];

// Etiqueta legible para un valor de entrega (tolera valores antiguos).
export const deliveryLabel = (value?: string | null): string => {
    const match = DELIVERY_OPTIONS.find((o) => o.value === value);
    if (match) return match.label;
    // Compatibilidad con pedidos anteriores (pickup / shipping).
    if (value === 'pickup') return '🏬 Recojo en Feria Grau';
    if (value === 'shipping') return '🚚 Envío a Domicilio (+ costo de envío)';
    return '🏬 Recojo en Feria Grau';
};

// ¿La entrega requiere dirección de envío? (todo lo que no sea recojo).
export const isShippingDelivery = (value?: string | null): boolean =>
    value !== 'feria_grau' && value !== 'pickup';
