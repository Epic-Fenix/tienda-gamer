'use client';

import { Product } from '@/types/database';
import { useCart } from '@/context/CartContext';
import { formatSoles } from '@/lib/payment';
import { platformStyle } from '@/components/ProductCard';

interface Props {
    product: Product;
    onClose: () => void;
    onReserve: (p: Product) => void;
    onBackorder: (p: Product) => void;
}

export default function ProductQuickView({ product, onClose, onReserve, onBackorder }: Props) {
    const { addItem } = useCart();
    const isSecond = product.condition === 'segunda_mano';
    const old = Number(product.old_price) || 0;
    const hasDiscount = old > product.price && product.price > 0;
    const discountPct = hasDiscount ? Math.round(((old - product.price) / old) * 100) : 0;

    const specs: { label: string; value: string }[] = [
        { label: 'Plataforma', value: product.platform || product.category },
        { label: 'Condición', value: isSecond ? 'Seminuevo / Reacondicionado' : 'Nuevo, sellado' },
        { label: 'Formato', value: 'Físico' },
        { label: 'Garantía', value: isSecond ? 'Revisado y garantizado por tienda' : 'Garantía de tienda' },
        { label: 'Acepta trueque', value: 'Sí, consúltalo' },
    ];

    const trust = [
        { icon: '🚚', text: 'Envío gratis en compras > S/ 300' },
        { icon: '🏬', text: 'Recojo en tienda física' },
        { icon: '💬', text: 'Soporte gamer vía chat / WhatsApp' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl my-6 bg-[#2a1352] backdrop-blur border border-[#3e1b75] rounded-2xl shadow-2xl shadow-violet-900/40 max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-3 right-3 z-10 text-slate-400 hover:text-white text-2xl leading-none" aria-label="Cerrar">×</button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5">
                    {/* Imagen */}
                    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                        <span className={`absolute top-2 left-2 z-10 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${platformStyle(product.platform)}`}>
                            {product.platform || product.category}
                        </span>
                        <span className={`absolute top-2 right-2 z-10 text-[10px] font-black px-2 py-0.5 rounded-md ${isSecond ? 'bg-purple-500 text-white' : 'bg-emerald-500 text-black'}`}>
                            {isSecond ? 'Seminuevo' : 'Nuevo'}
                        </span>
                        {product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xs text-slate-600">Sin imagen</span>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-col">
                        <h2 className="text-lg font-black text-white leading-tight">{product.name}</h2>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-3">{product.description || 'Sin descripción disponible.'}</p>

                        {/* Precio */}
                        <div className="mt-3 flex items-end gap-2">
                            {hasDiscount && <span className="text-sm text-slate-500 line-through">S/. {formatSoles(old)}</span>}
                            <span className="text-2xl font-black text-white">S/. {formatSoles(product.price)}</span>
                            {hasDiscount && <span className="text-[11px] font-black px-1.5 py-0.5 rounded bg-fuchsia-600 text-white mb-1">-{discountPct}%</span>}
                        </div>
                        <p className="text-[11px] mt-1 font-semibold">
                            {product.stock <= 0 ? (
                                <span className="text-rose-400">Agotado</span>
                            ) : product.stock <= 3 ? (
                                <span className="text-amber-400">⚡ Últimas {product.stock} unidades</span>
                            ) : (
                                <span className="text-emerald-400">✓ {product.stock} disponibles</span>
                            )}
                        </p>

                        {/* Ficha técnica */}
                        <div className="mt-3 rounded-xl border border-slate-800 divide-y divide-slate-800 text-xs overflow-hidden">
                            {specs.map((s) => (
                                <div key={s.label} className="flex justify-between gap-2 px-3 py-1.5">
                                    <span className="text-slate-500">{s.label}</span>
                                    <span className="text-slate-200 font-semibold text-right">{s.value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Acciones */}
                        <div className="mt-4 flex flex-col gap-2">
                            {product.stock > 0 ? (
                                <>
                                    <button
                                        onClick={() => { addItem(product); onClose(); }}
                                        className="w-full py-2.5 rounded-lg text-sm font-black text-zinc-950 bg-[#fcd34d] hover:bg-[#fbbf24] shadow-md shadow-amber-900/20 transition-all"
                                    >
                                        🛒 Agregar al carrito
                                    </button>
                                    <button
                                        onClick={() => { onReserve(product); onClose(); }}
                                        className="w-full py-2 rounded-lg text-sm font-bold text-violet-300 bg-slate-800/70 hover:bg-slate-700 border border-violet-500/20 hover:border-violet-500/50 transition"
                                    >
                                        Separar con {product.min_reservation_pct}%
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => { onBackorder(product); onClose(); }}
                                    className="w-full py-2.5 rounded-lg text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
                                >
                                    Encargar producto
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Micro-banners de confianza */}
                <div className="border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
                    {trust.map((t) => (
                        <div key={t.text} className="flex items-center gap-2 px-4 py-3">
                            <span className="text-base">{t.icon}</span>
                            <span className="text-[11px] text-slate-300 font-semibold leading-tight">{t.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
