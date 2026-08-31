export type Condition = 'nuevo' | 'segunda_mano';

export interface Product {
    id: string;
    name: string;
    slug: string;
    description?: string;
    category: string;
    platform?: string;
    condition: string;
    price: number;
    cost_price?: number; // Costo de adquisición (S/.)
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
    is_full_payment?: boolean;
    coupon_code?: string | null;
    discount_amount?: number;
    pickup_deadline?: string;
    status: OrderStatus | string;
    created_at?: string;
    product?: Product;
    items?: OrderItem[] | null;
}

export interface Banner {
    id: string;
    title: string;
    subtitle?: string | null;
    image_url?: string | null;
    button_text?: string | null;
    link_url?: string | null;
    is_active: boolean;
    order_index: number;
    created_at?: string;
}

export type DiscountType = 'percent' | 'fixed';

export interface Coupon {
    id: string;
    code: string;
    discount_type: DiscountType;
    discount_value: number;
    is_active: boolean;
    max_uses?: number | null;   // null = usos ilimitados
    uses_count?: number;        // veces ya utilizado
    created_at?: string;
}

export type TradeInStatus = 'pending' | 'contacted' | 'closed';

export interface TradeIn {
    id: string;
    customer_name: string;
    customer_phone: string;
    offered_item: string;
    wanted_item?: string | null;
    status: TradeInStatus | string;
    created_at?: string;
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
