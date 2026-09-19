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

// Color de marca oficial por plataforma.
export function platformStyle(platform?: string): string {
    const s = (platform || '').toLowerCase();
    if (s.includes('ps5')) return 'bg-white text-black border border-gray-300';
    if (s.includes('ps3')) return 'bg-black text-white border border-white/20';
    if (s.includes('ps4') || s.includes('ps2') || s.includes('playstation')) return 'bg-[#00439C] text-white border border-white/20';
    if (s.includes('xbox')) return 'bg-[#107C10] text-white border border-white/20';
    if (s.includes('switch') || s.includes('nintendo')) return 'bg-[#E60012] text-white border border-white/20';
    return 'bg-violet-600 text-white border border-white/20';
}

// Logo SVG de marca (14px, fill-current). null si no hay logo para esa plataforma.
export function platformLogo(platform?: string) {
    const s = (platform || '').toLowerCase();
    const cls = 'w-5 h-5 fill-current shrink-0';
    if (s.includes('ps') || s.includes('playstation')) {
        return (
            <svg viewBox="0 0 24 24" className={cls} aria-hidden="true"><path d="M8.985 2.596v17.548l3.915 1.261V6.688c0-.69.304-1.151.794-.991.636.181.76.814.76 1.505v5.876c2.441 1.193 4.362-.002 4.362-3.153 0-3.237-1.126-4.675-4.438-5.827-1.307-.448-3.728-1.186-5.393-1.502zm4.656 16.242l6.296-2.275c.715-.258.826-.625.246-.818-.586-.192-1.637-.139-2.357.123l-4.205 1.499v-2.385l.24-.085s1.201-.42 2.913-.615c1.696-.18 3.785.03 5.437.661 1.848.688 2.041 1.706 1.588 2.404-.454.686-1.596 1.192-1.596 1.192l-8.629 3.09v-2.412zm-9.209.316c-1.906-.531-2.224-1.646-1.359-2.294.799-.598 2.15-1.055 2.15-1.055l5.606-1.996v2.267l-4.056 1.44c-.717.258-.827.625-.246.818.586.192 1.637.14 2.354-.123l1.948-.7v2.021c-.124.024-.263.049-.393.073-1.939.32-4.006.186-5.958-.42z"/></svg>
        );
    }
    if (s.includes('switch') || s.includes('nintendo')) {
        return (
            <svg viewBox="0 0 24 24" className={cls} aria-hidden="true"><path d="M14.176 24h3.674c3.376 0 6.15-2.774 6.15-6.15V6.15C24 2.775 21.226 0 17.85 0H14.1c-.074 0-.15.075-.15.15v23.7c0 .075.076.15.226.15zm4.574-13.199c1.351 0 2.399 1.125 2.399 2.398 0 1.35-1.125 2.399-2.399 2.399-1.35 0-2.398-1.049-2.398-2.399-.075-1.273 1.048-2.398 2.398-2.398zM6.15 0C2.775 0 0 2.775 0 6.15v11.7C0 21.226 2.775 24 6.15 24h3.75c.074 0 .149-.075.149-.15V.15c0-.075-.075-.15-.149-.15zm1.199 20.4c-2.324 0-4.276-1.876-4.276-4.276V7.801c0-2.324 1.877-4.276 4.276-4.276.674 0 1.199.6 1.199 1.2v14.55c0 .599-.525 1.125-1.199 1.125z"/></svg>
        );
    }
    if (s.includes('xbox')) {
        return (
            <svg viewBox="0 0 24 24" className={cls} aria-hidden="true"><path d="M4.102 21.033C6.211 22.881 8.977 24 12 24c3.026 0 5.789-1.119 7.902-2.967 1.877-1.912-4.316-8.709-7.902-11.417-3.582 2.708-9.779 9.505-7.898 11.417zm11.16-14.406c2.5 2.961 7.484 10.313 6.076 12.912C23.002 17.48 24 14.861 24 12.004c0-3.34-1.365-6.362-3.57-8.536 0 0-.027-.022-.082-.042-.063-.022-.152-.045-.281-.045-.592 0-1.985.434-4.805 3.246zM3.654 3.426c-.057.02-.082.041-.086.042C1.365 5.642 0 8.664 0 12.004c0 2.854.998 5.473 2.661 7.533-1.401-2.605 3.579-9.951 6.08-12.91-2.82-2.813-4.216-3.245-4.806-3.245-.128 0-.216.021-.281.046v-.002zM12 3.551S9.055 1.828 6.755 1.746c-.903-.032-1.454.195-1.521.229C7.379.454 9.659 0 11.984 0H12c2.334 0 4.605.454 6.766 1.975-.067-.034-.618-.261-1.521-.229C14.945 1.828 12 3.551 12 3.551z"/></svg>
        );
    }
    return null;
}

// ¿Es una consola? (define si aplica la etiqueta "Reacondicionado").
export function isConsole(product: Product): boolean {
    const cat = (product.category || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    return /consola/.test(cat) || /consola/.test(name);
}

// Texto de condición según reglas de negocio:
// - "Reacondicionado" SOLO para consolas de segunda mano.
// - Juegos y accesorios usan únicamente "Nuevo" o "Seminuevo".
export function conditionText(product: Product): string {
    const isSecond = product.condition === 'segunda_mano';
    if (!isSecond) return 'Nuevo';
    return isConsole(product) ? 'Reacondicionado' : 'Seminuevo';
}

// Tipo de producto dinámico (badge): cartucho, disco, hardware o coleccionable.
export function productKind(product: Product): { icon: string; label: string } {
    const cat = (product.category || '').toLowerCase();
    const name = (product.name || '').toLowerCase();
    const plat = (product.platform || '').toLowerCase();
    // Hardware: consolas, mandos y accesorios.
    if (/consola|accesori|mando|control|hardware|audíf|auricular|headset/.test(cat) || /consola|mando|control|dualsense/.test(name)) {
        return { icon: '🕹️', label: 'HARDWARE ORIGINAL' };
    }
    // Coleccionables: figuras, anime, Funko.
    if (/figura|anime|colec|funko|peluche/.test(cat) || /funko|figura|amiibo/.test(name)) {
        return { icon: '🧸', label: 'COLECCIONABLE' };
    }
    // Juegos de Nintendo Switch → cartucho físico.
    if (/switch|nintendo/.test(plat)) {
        return { icon: '🎴', label: 'CARTUCHO FÍSICO' };
    }
    // Juegos de PS5/PS4/Xbox → disco físico.
    return { icon: '💿', label: 'DISCO FÍSICO' };
}

// ¿Es una "Joya Épica"? (juego raro, coleccionable o de alta demanda).
export function isEpic(product: Product): boolean {
    if (product.is_epic === true) return true;
    const t = `${product.category ?? ''} ${product.name ?? ''}`.toLowerCase();
    return /joya|épic|epic|oculta/.test(t);
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
    // Nintendo Switch: label corto y cápsula más compacta (evita badge exagerado).
    const isSwitch = /switch|nintendo/.test((product.platform || '').toLowerCase());
    const badgeLabel = isSwitch ? 'Switch' : (product.platform || product.category);
    const badgeCapsule = isSwitch ? 'gap-1.5 px-2 py-1 text-[10px]' : 'gap-2 px-3 py-1.5 text-xs';

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
                {/* Brand badge de plataforma (sup. izquierda) */}
                <span className={`absolute top-2 left-2 z-10 flex items-center rounded-md font-black uppercase tracking-wide shadow-lg backdrop-blur-md ${badgeCapsule} ${platformStyle(product.platform)}`}>
                    {platformLogo(product.platform)}
                    {badgeLabel}
                </span>
                {/* Estado (sup. derecha) */}
                <span className={`absolute top-1.5 right-1.5 z-10 text-[9px] font-black px-1.5 py-0.5 rounded shadow ${isSecond ? 'bg-[#8b5cf6] text-white' : 'bg-[#2dd4bf] text-zinc-950'}`}>
                    {conditionText(product)}
                </span>
                {/* Joya Épica */}
                {isEpic(product) && (
                    <span className="absolute bottom-1.5 right-1.5 z-10 text-[9px] font-black px-1.5 py-0.5 rounded bg-gradient-to-r from-[#8b5cf6] to-[#2dd4bf] text-white shadow" style={{ textShadow: '0 0 6px rgba(139,92,246,0.9)' }}>
                        💎 ÉPICO
                    </span>
                )}
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

            {/* Tags: tipo de producto + N° de discos */}
            <div className="flex flex-wrap items-center gap-1 mb-1">
                <span className="text-[9px] font-bold uppercase tracking-wide text-[#2dd4bf] bg-[#2dd4bf]/10 px-1.5 py-0.5 rounded">
                    {kind.icon} {kind.label}
                </span>
                {product.discs != null && product.discs >= 2 && (
                    <span className="text-[9px] font-black uppercase tracking-wide text-[#fcd34d] bg-[#fcd34d]/10 border border-[#fcd34d]/30 px-1.5 py-0.5 rounded">
                        💿 {product.discs} discos
                    </span>
                )}
            </div>

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

            {/* Precio / Agotado */}
            {product.stock <= 0 ? (
                <span className="mt-auto inline-flex w-max items-center gap-1 text-sm font-black px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/40">
                    🔴 AGOTADO
                </span>
            ) : (
                <>
                    {hasDiscount && (
                        <div className="mt-auto flex items-center gap-2 flex-wrap">
                            <span className="line-through text-zinc-400 text-xs">S/. {formatSoles(old)}</span>
                            <span className="text-[11px] font-black px-1.5 py-0.5 rounded bg-[#fcd34d] text-zinc-950">
                                -{Math.round((1 - product.price / old) * 100)}%
                            </span>
                        </div>
                    )}
                    <span className={`text-xl font-black text-white leading-tight ${hasDiscount ? '' : 'mt-auto'}`}>S/. {formatSoles(product.price)}</span>
                </>
            )}

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
                    <>
                        <button
                            disabled
                            className="w-full py-2 rounded-lg text-xs font-black bg-slate-800 text-slate-500 cursor-not-allowed"
                        >
                            🔴 Agotado / Sin Stock
                        </button>
                        <button
                            onClick={() => onBackorder(product)}
                            className="w-full py-1.5 rounded-lg text-[11px] font-bold text-[#c4b5fd] bg-[#3e1b75]/50 hover:bg-[#3e1b75] transition"
                        >
                            Encargar producto
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
