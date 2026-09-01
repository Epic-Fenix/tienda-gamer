// URL pública del sitio (usada para construir enlaces en los códigos QR).
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tienda-gamer-tau.vercel.app';

// Enlace a la boleta/orden de un pedido.
export const orderUrl = (code: string) => `${SITE_URL}/order/${code}`;

// Datos corporativos de la tienda.
export const STORE = {
    name: 'SCOTT GAMES',
    address: 'Puesto físico en Feria Grau, Lima - Perú',
    ruc: '', // Coloca aquí tu RUC real para mostrarlo en la boleta
};

// =====================================================================
// Canales oficiales de contacto de SCOTT GAMES.
// =====================================================================
export const CONTACT = {
    email: 'scottgamestore@gmail.com',
    // WhatsApp principal (ventas y checkout).
    whatsappSales: '+51 939 719 872',
    whatsappSalesDigits: '51939719872',
    whatsappSalesLink: 'https://wa.me/message/TEBDYEKCXWVZF1',
    // WhatsApp secundario (soporte).
    whatsappSupport: '+51 937 048 605',
    whatsappSupportDigits: '51937048605',
    location: 'Puesto físico en Feria Grau, Lima - Perú',
};

// =====================================================================
// Opciones de tipo de entrega (compartidas por carrito, reserva, boleta).
// Fuente única de verdad para mantener consistencia en toda la app.
// =====================================================================
export type DeliveryValue = 'feria_grau' | 'domicilio' | 'provincia';

export interface DeliveryOption {
    value: DeliveryValue;
    label: string;   // Etiqueta completa con tarifa (para selects/boleta).
    short: string;   // Nombre corto (para el mensaje de WhatsApp).
    fee: number;     // Costo base de envío en soles.
}

export const DELIVERY_OPTIONS: DeliveryOption[] = [
    { value: 'feria_grau', label: '🏬 Recojo en Feria Grau - Gratis', short: 'Recojo en Feria Grau', fee: 0 },
    { value: 'domicilio', label: '🚚 Envío a Domicilio Lima (+ S/. 15.00)', short: 'Envío a Domicilio Lima', fee: 15 },
    { value: 'provincia', label: '📦 Envío a Provincia (+ S/. 18.00)', short: 'Envío a Provincia', fee: 18 },
];

// Umbral de envío gratis: si el subtotal de productos alcanza este monto,
// el costo de envío pasa a S/. 0.00 automáticamente.
export const FREE_SHIPPING_THRESHOLD = 300;

// Etiqueta completa (tolera valores antiguos pickup/shipping).
export const deliveryLabel = (value?: string | null): string => {
    const match = DELIVERY_OPTIONS.find((o) => o.value === value);
    if (match) return match.label;
    if (value === 'pickup') return '🏬 Recojo en Feria Grau - Gratis';
    if (value === 'shipping') return '🚚 Envío a Domicilio Lima (+ S/. 15.00)';
    return '🏬 Recojo en Feria Grau - Gratis';
};

// Nombre corto para el mensaje de WhatsApp.
export const deliveryShort = (value?: string | null): string => {
    const match = DELIVERY_OPTIONS.find((o) => o.value === value);
    if (match) return match.short;
    if (value === 'shipping') return 'Envío a Domicilio Lima';
    return 'Recojo en Feria Grau';
};

// Costo de envío aplicado: 0 para recojo; gratis si el subtotal alcanza el umbral.
export const shippingCost = (value?: string | null, subtotal = 0): number => {
    const match = DELIVERY_OPTIONS.find((o) => o.value === value);
    const base = match?.fee ?? (value === 'shipping' ? 15 : 0);
    if (base === 0) return 0;
    return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : base;
};

// ¿La entrega requiere dirección de envío? (todo lo que no sea recojo).
export const isShippingDelivery = (value?: string | null): boolean =>
    value !== 'feria_grau' && value !== 'pickup';
