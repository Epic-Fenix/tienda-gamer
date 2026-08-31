'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Order } from '@/types/database';
import { ORDER_STEPS, statusToStep } from '@/lib/orderStatus';
import { formatSoles } from '@/lib/payment';
import { orderUrl } from '@/lib/site';
import { QRCodeSVG } from 'qrcode.react';

export default function OrderTracker() {
    const [open, setOpen] = useState(false);
    const [term, setTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [results, setResults] = useState<Order[]>([]);
    const [lastQuery, setLastQuery] = useState('');

    const runSearch = async (q: string) => {
        const digits = q.replace(/\D/g, '');
        const filters = [`order_code.ilike.%${q}%`];
        if (digits.length >= 6) filters.push(`customer_phone.ilike.%${digits}%`);

        const { data } = await supabase
            .from('orders')
            .select('*')
            .or(filters.join(','))
            .order('created_at', { ascending: false })
            .limit(10);

        setResults((data as Order[]) || []);
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const q = term.trim();
        if (q === '') return;
        setLoading(true);
        setSearched(true);
        setLastQuery(q);
        await runSearch(q);
        setLoading(false);
    };

    // Actualiza el resultado en vivo cuando cambia alguna orden (estado, etc.).
    useEffect(() => {
        if (!open || lastQuery === '') return;
        const channel = supabase
            .channel('order-tracker-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => runSearch(lastQuery))
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [open, lastQuery]);

    const close = () => {
        setOpen(false);
        setTerm('');
        setResults([]);
        setSearched(false);
        setLastQuery('');
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
                Consultar Pedido
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />
                    <div className="relative w-full max-w-lg my-10 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
                        <div className="flex items-center justify-between p-5 border-b border-slate-800">
                            <h2 className="text-lg font-black text-white">Consultar mi Pedido</h2>
                            <button onClick={close} className="text-slate-400 hover:text-white text-2xl leading-none" aria-label="Cerrar">×</button>
                        </div>

                        <div className="p-5 space-y-4">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <input
                                    autoFocus
                                    type="text"
                                    value={term}
                                    onChange={(e) => setTerm(e.target.value)}
                                    placeholder="Código (ORD-xxx / CART-xxx) o WhatsApp"
                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                                />
                                <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition disabled:opacity-50">
                                    {loading ? '...' : 'Buscar'}
                                </button>
                            </form>

                            {searched && !loading && results.length === 0 && (
                                <p className="text-center text-sm text-slate-500 py-6">No encontramos pedidos con ese dato. Verifica tu código o número.</p>
                            )}

                            {results.map((order) => {
                                const step = statusToStep(order.status);
                                return (
                                    <div key={order.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono font-bold text-indigo-400 text-sm">{order.order_code}</span>
                                            <span className="text-[10px] text-slate-500">{order.created_at ? new Date(order.created_at).toLocaleDateString('es-PE') : ''}</span>
                                        </div>

                                        {/* Stepper de estado */}
                                        <div className="flex items-center">
                                            {ORDER_STEPS.map((label, i) => (
                                                <div key={label} className="flex-1 flex flex-col items-center relative">
                                                    {i > 0 && <div className={`absolute right-1/2 top-2.5 h-0.5 w-full ${i <= step ? 'bg-indigo-500' : 'bg-slate-700'}`} />}
                                                    <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${i <= step ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                                        {i < step ? '✓' : i + 1}
                                                    </div>
                                                    <span className={`mt-1 text-[8px] text-center leading-tight ${i <= step ? 'text-slate-200' : 'text-slate-500'}`}>{label}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Productos */}
                                        <div className="text-xs space-y-1 border-t border-slate-800 pt-2">
                                            {Array.isArray(order.items) && order.items.length > 0 ? (
                                                order.items.map((it) => (
                                                    <div key={it.product_id} className="flex justify-between gap-2 text-slate-300">
                                                        <span>{it.quantity}× {it.name}</span>
                                                        <span className="text-slate-500">S/. {formatSoles(it.price * it.quantity)}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-slate-400">Pedido de 1 producto</p>
                                            )}
                                            <div className="flex justify-between text-slate-400 pt-1">
                                                <span>Modalidad de pago:</span>
                                                <span className={`font-bold ${order.is_full_payment ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                                    {order.is_full_payment ? 'Pago Total (100%)' : 'Separación / Adelanto'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-slate-400">
                                                <span>{order.is_full_payment ? 'Pagado:' : 'Abonado:'}</span>
                                                <span className="text-emerald-400 font-semibold">S/. {formatSoles(Number(order.paid_amount) || 0)}</span>
                                            </div>
                                            <div className="flex justify-between font-bold text-amber-400">
                                                <span>Saldo pendiente:</span>
                                                <span>S/. {formatSoles(Number(order.pending_amount) || 0)}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="bg-white p-1.5 rounded-lg shrink-0">
                                                <QRCodeSVG value={orderUrl(order.order_code)} size={64} />
                                            </div>
                                            <a href={`/order/${order.order_code}`} className="flex-1 text-center py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition">
                                                Ver boleta y datos de pago
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
