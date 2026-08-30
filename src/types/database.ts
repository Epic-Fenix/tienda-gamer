export interface Product {
    id: string;
    name: string;
    slug: string;
    description?: string;
    category: string;
    platform?: string;
    condition: string;
    price: number;
    stock: number;
    allow_reservation: boolean;
    min_reservation_pct: number;
    image_url?: string | null;
    barcode?: string;
    created_at?: string;
}

export type OrderStatus = 'reserved' | 'completed' | 'cancelled';

// Ítem de una orden multi-producto (carrito). Se guarda como JSON en orders.items.
export interface OrderItem {
    product_id: string;
    name: string;
    price: number;
    quantity: number;
    image_url?: string | null;
    min_reservation_pct?: number;
    // Solo para uso en el cliente (no se persiste): tope de unidades disponibles.
    stock?: number;
}

export interface Order {
    id: string;
    order_code: string;
    product_id: string | null;
    customer_name: string;
    customer_phone: string;
    customer_email?: string | null;
    delivery_type: string;
    shipping_address?: string | null;
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
    pickup_deadline?: string;
    status: OrderStatus | string;
    created_at?: string;
    product?: Product;
    items?: OrderItem[] | null;
}

export type BackorderStatus = 'pending' | 'notified' | 'completed';

export interface Backorder {
    id: string;
    product_id: string;
    customer_name: string;
    customer_phone: string;
    customer_email?: string | null;
    status: BackorderStatus;
    created_at: string;
    product?: Product;
}
