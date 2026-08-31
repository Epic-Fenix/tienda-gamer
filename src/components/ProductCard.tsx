'use client';

import { useState } from 'react';
import { Product } from '@/types/database';
import { useCart } from '@/context/CartContext';
import { formatSoles } from '@/lib/payment';

interface Props {
    product: Product;
    onReserve: (p: Product) => void;
    onBackorder: (p: Product) => void;
    onQuickView: (p: Product) => void;
}

// Color temático por plataforma.
export function platformStyle(platform?: string): string {
    const s = (platform || '').toLowerCase();
    if (s.includes('ps5') || s.includes('ps4') || s.includes('playstation')) return 'bg-blue-600 text-white';
    if (s.includes('xbox')) return 'bg-emerald-600 text-white';
    if (s.includes('switch') || s.includes('nintendo')) return 'bg-red-600 text-white';
    return 'bg-violet-600 text-white';
}

// Tipo de producto dinámico (badge): disco físico, hardware o coleccionable.
export function productKind(product: Product): { icon: string; label: string } {
    const cat = (product.category || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    const plat = (product.platform || '').toLowerCase();
    if (/consola|accesori|mando|control|hardware|audíf|auricular|headset/.test(cat) || /consola|mando|control|dualsense/.test(name)) {
        return { icon: '🕹️', label: 'HARDWARE ORIGINAL' };
    }
    if (/figura|anime|colec|funko|peluche/.test(cat) || /funko|figura|amiibo/.test(name)) {
        return { icon: '🧸', label: 'COLECCIONABLE' };
    }
    if (cat.includes('juego') || /ps5|ps4|switch|xbox|nintendo|playstation/.test(plat)) {
        return { icon: '💿', label: 'DISCO FÍSICO' };
    }
    return { icon: '💿', label: 'DISCO FÍSICO' };
}

export default function ProductCard({ product, onReserve, onBackorder, onQuickView }: Props) {
    const { addItem } = useCart();
    const [added, setAdded] = useState(false);
    const [imgError, setImgError] = useState(false);
    const kind = productKind(product);

    const isSecond = product.condition === 'segunda_mano';
    const old = Number(product.old_price) || 0;
    const hasDiscount = old > product.price && product.price > 0;
    const discountPct = hasDiscount ? Math.round(((old - product.price) / old) * 100) : 0;
    const lowStock = product.stock > 0 && product.stock <= 3;

    const handleAdd = () => {
        addItem(product);
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
    };

    return (
        <div className="group relative bg-[#2a1352] border border-[#3e1b75] rounded-xl p-2.5 flex flex-col hover:border-[#8b5cf6]/70 hover:shadow-lg hover:shadow-[#8b5cf6]/20 transition-all duration-300">
            {/* Carátula */}
            <button
                onClick={() => onQuickView(product)}
                className="relative w-full aspect-[3/4] mb-2 rounded-lg overflow-hidden bg-[#13072b] flex items-center justify-center border border-[#3e1b75] text-left"
                aria-label={`Vista rápida de ${product.name}`}
            >
                {/* Plataforma (sup. izquierda) */}
                <span className={`absolute top-1.5 left-1.5 z-10 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded shadow ${platformStyle(product.platform)}`}>
                    {product.platform || product.category}
                </span>
                {/* Estado (sup. derecha) */}
                <span className={`absolute top-1.5 right-1.5 z-10 text-[9px] font-black px-1.5 py-0.5 rounded shadow ${isSecond ? 'bg-[#8b5cf6] text-white' : 'bg-[#2dd4bf] text-zinc-950'}`}>
                    {isSecond ? 'Seminuevo' : 'Nuevo'}
                </span>
                {/* Descuento */}
                {hasDiscount && (
                    <span className="absolute bottom-1.5 left-1.5 z-10 text-[10px] font-black px-1.5 py-0.5 rounded bg-[#fcd34d] text-zinc-950 shadow">
                        -{discountPct}%
                    </span>
                )}
                {product.image_url && !imgError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_url} alt={product.name} onError={() => setImgError(true)} className="w-full h-full object-cover group-hover:scale-110 transition duration-500 ease-out" />
                ) : (
                    <span className="text-xs text-[#6d4aa8]">Sin imagen</span>
                )}
                <span className="absolute inset-x-0 bottom-0 py-1 text-center text-[10px] font-bold text-white bg-black/60 opacity-0 group-hover:opacity-100 transition">
                    👁️ Vista rápida
                </span>
            </button>

            {/* Tag de tipo de producto (dinámico) */}
            <span className="self-start text-[9px] font-bold uppercase tracking-wide text-[#2dd4bf] bg-[#2dd4bf]/10 px-1.5 py-0.5 rounded mb-1">
                {kind.icon} {kind.label}
            </span>

            {/* Nombre */}
            <h3 className="font-bold text-[13px] text-white leading-tight line-clamp-2 mb-1">{product.name}</h3>

            {/* Stock físico */}
            <div className="mb-2 min-h-[14px]">
                {product.stock <= 0 ? (
                    <span className="text-[10px] font-bold text-rose-400">Agotado</span>
                ) : lowStock ? (
                    <span className="text-[10px] font-bold text-[#fcd34d]">⚡ Últimas {product.stock} unidades</span>
                ) : (
                    <span className="text-[10px] font-semibold text-[#2dd4bf]">📍 Stock en tienda ({product.stock})</span>
                )}
            </div>

            {/* Precio */}
            <div className="mt-auto flex items-end gap-2 flex-wrap">
                {hasDiscount && <span className="text-[11px] text-[#8a72b8] line-through">S/. {formatSoles(old)}</span>}
                {hasDiscount && <span className="text-[11px] font-black text-[#fcd34d]">-{discountPct}%</span>}
            </div>
            <span className="text-xl font-black text-white leading-tight">S/. {formatSoles(product.price)}</span>

            {/* Acciones */}
            <div className="mt-2.5 flex flex-col gap-1.5">
                {product.stock > 0 ? (
                    <>
                        <button
                            onClick={handleAdd}
                            className={`w-full py-2 rounded-lg text-xs font-black transition-all ${added ? 'bg-[#2dd4bf] text-zinc-950' : 'bg-[#fcd34d] text-zinc-950 hover:bg-[#fbbf24]'}`}
                        >
                            {added ? '✓ Agregado' : '🛒 Agregar al carrito'}
                        </button>
                        <button
                            onClick={() => onReserve(product)}
                            className="w-full py-1.5 rounded-lg text-[11px] font-bold text-[#c4b5fd] bg-[#3e1b75]/50 hover:bg-[#3e1b75] border border-[#8b5cf6]/30 hover:border-[#8b5cf6]/60 transition"
                        >
                            Separar con {product.min_reservation_pct}%
                        </button>
                    </>
                ) : (
                    <button
                        onClick={() => onBackorder(product)}
                        className="w-full py-2 rounded-lg text-xs font-bold text-[#c4b5fd] bg-[#3e1b75]/50 hover:bg-[#3e1b75] transition"
                    >
                        Encargar producto
                    </button>
                )}
            </div>
        </div>
    );
}
