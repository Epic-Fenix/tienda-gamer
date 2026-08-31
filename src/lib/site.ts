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
