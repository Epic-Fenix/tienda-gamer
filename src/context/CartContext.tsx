'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Product, OrderItem } from '@/types/database';

const STORAGE_KEY = 'tg_cart';

interface CartContextValue {
    items: OrderItem[];
    isOpen: boolean;
    count: number;
    total: number;
    reservationTotal: number;
    pendingTotal: number;
    addItem: (product: Product, qty?: number) => void;
    removeItem: (productId: string) => void;
    setQuantity: (productId: string, qty: number) => void;
    clear: () => void;
    openCart: () => void;
    closeCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<OrderItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [hydrated, setHydrated] = useState(false);

    // Carga inicial desde localStorage (no existe en SSR).
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) setItems(JSON.parse(raw));
        } catch {
            // Ignorar
        }
        setHydrated(true);
    }, []);

    // Persiste cada cambio (solo tras la hidratación para no pisar el valor guardado).
    useEffect(() => {
        if (!hydrated) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {
            // Ignorar
        }
    }, [items, hydrated]);

    const addItem = (product: Product, qty = 1) => {
        setItems((prev) => {
            const existing = prev.find((i) => i.product_id === product.id);
            const maxStock = Number(product.stock) || 0;
            if (existing) {
                const nextQty = maxStock > 0 ? Math.min(existing.quantity + qty, maxStock) : existing.quantity + qty;
                return prev.map((i) => (i.product_id === product.id ? { ...i, quantity: nextQty } : i));
            }
            return [
                ...prev,
                {
                    product_id: product.id,
                    name: product.name,
                    price: Number(product.price) || 0,
                    quantity: qty,
                    image_url: product.image_url ?? null,
                    min_reservation_pct: Number(product.min_reservation_pct) || 0,
                    stock: maxStock,
                },
            ];
        });
        setIsOpen(true);
    };

    const removeItem = (productId: string) => {
        setItems((prev) => prev.filter((i) => i.product_id !== productId));
    };

    const setQuantity = (productId: string, qty: number) => {
        setItems((prev) =>
            prev
                .map((i) => {
                    if (i.product_id !== productId) return i;
                    const cap = i.stock && i.stock > 0 ? i.stock : Infinity;
                    return { ...i, quantity: Math.max(0, Math.min(qty, cap)) };
                })
                .filter((i) => i.quantity > 0)
        );
    };

    const clear = () => setItems([]);
    const openCart = () => setIsOpen(true);
    const closeCart = () => setIsOpen(false);

    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const reservationTotal = items.reduce(
        (sum, i) => sum + (i.price * i.quantity * (i.min_reservation_pct || 0)) / 100,
        0
    );
    const pendingTotal = total - reservationTotal;

    return (
        <CartContext.Provider
            value={{
                items,
                isOpen,
                count,
                total,
                reservationTotal,
                pendingTotal,
                addItem,
                removeItem,
                setQuantity,
                clear,
                openCart,
                closeCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>');
    return ctx;
}
