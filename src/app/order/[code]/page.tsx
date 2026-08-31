'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import PaymentInfo from '@/components/PaymentInfo';
import { Order, OrderItem } from '@/types/database';
import { orderUrl, STORE, deliveryLabel } from '@/lib/site';
import { formatSoles } from '@/lib/payment';
import { statusLabel, statusToStep } from '@/lib/orderStatus';

export default function OrderPage({ params }: { params: Promise<{ code: string }> }) {
    const resolvedParams = use(params);
    const code = resolvedParams.code;
    const [order, setOrder] = useState<Order | null>(null);
    const [product, setProduct] = useState<{ name?: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            const { data: orderData } = await supabase.from('orders').select('*').eq('order_code', code).single();
            if (orderData) {
                setOrder(orderData as Order);
                if (orderData.product_id) {
                    const { data: prodData } = await supabase.from('products').select('*').eq('id', orderData.product_id).single();
                    if (prodData) setProduct(prodData);
                }
            }
            setLoading(false);
        };
        fetchOrder();

        // Estado en vivo: la boleta se actualiza cuando el admin cambia el pedido.
        const channel = supabase
            .channel(`order-${code}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `order_code=eq.${code}` }, (payload) => {
                setOrder(payload.new as Order);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [code]);

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando comprobante...</div>;
    if (!order) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-rose-400">Orden no encontrada.</div>;

    const step = statusToStep(order.status);
    const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
    const createdAt = order.created_at ? new Date(order.created_at).toLocaleString('es-PE') : '—';

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center">
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: #ffffff !important; }
                    .boleta { background: #ffffff !important; color: #000 !important; border: 1px solid #ccc !important; box-shadow: none !important; }
                    .boleta * { color: #000 !important; border-color: #ddd !important; }
                    .boleta .qr-box { background: #fff !important; }
                }
            `}</style>

            <div className="boleta bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl my-6">
                {/* Encabezado corporativo */}
                <div className="text-center border-b border-slate-800 pb-4 mb-4">
                    <h1 className="text-2xl font-black tracking-wider text-indigo-400">{STORE.name}</h1>
                    <p className="text-[11px] text-slate-400 mt-1">{STORE.address}</p>
                    <p className="text-[11px] text-slate-500">
                        {STORE.ruc ? `RUC: ${STORE.ruc}` : 'RUC: por configurar'} · Nota de Pedido: <span className="font-mono text-slate-300">{order.order_code}</span>
                    </p>
                </div>

                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="text-[11px] text-slate-500">Comprobante de Separación</p>
                        <p className="text-[11px] text-slate-500">Fecha: {createdAt}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${step >= 4 ? 'bg-emerald-500/15 text-emerald-400' : step >= 1 ? 'bg-sky-500/15 text-sky-400' : 'bg-amber-500/15 text-amber-400'}`}>
                        {statusLabel(order.status)}
                    </span>
                </div>

                {/* QR */}
                <div className="qr-box bg-white p-4 rounded-xl w-max mx-auto mb-5">
                    <QRCodeSVG value={orderUrl(order.order_code)} size={150} />
                </div>

                {/* Detalle de productos */}
                <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-4 text-xs mb-4">
                    <p className="text-slate-500 uppercase text-[10px] font-bold tracking-wider mb-2">Detalle del pedido</p>
                    {items.length > 0 ? (
                        <div className="space-y-1">
                            {items.map((it) => (
                                <div key={it.product_id} className="flex justify-between gap-2">
                                    <span className="text-white">{it.quantity}× {it.name}</span>
                                    <span className="text-slate-400">S/. {formatSoles(it.price * it.quantity)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex justify-between gap-2">
                            <span className="text-white">{product?.name || 'Producto'}</span>
                            <span className="text-slate-400">S/. {formatSoles(Number(order.total_amount) || 0)}</span>
                        </div>
                    )}

                    <div className="border-t border-slate-800 mt-3 pt-2 space-y-1">
                        <div className="flex justify-between text-slate-400"><span>Total:</span><span className="font-bold text-white">S/. {formatSoles(Number(order.total_amount) || 0)}</span></div>
                        {Number(order.discount_amount) > 0 && (
                            <div className="flex justify-between text-emerald-400"><span>Descuento{order.coupon_code ? ` (${order.coupon_code})` : ''}:</span><span>− S/. {formatSoles(Number(order.discount_amount) || 0)}</span></div>
                        )}
                        <div className="flex justify-between text-slate-400">
                            <span>Modalidad:</span>
                            <span className={`font-bold ${order.is_full_payment ? 'text-emerald-400' : 'text-indigo-400'}`}>{order.is_full_payment ? 'Pago Total (100%)' : 'Separación / Adelanto'}</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-400"><span>{order.is_full_payment ? 'Pagado:' : 'Abono:'}</span><span>S/. {formatSoles(Number(order.paid_amount) || 0)}</span></div>
                        <div className="flex justify-between font-bold text-amber-400"><span>Saldo a pagar:</span><span>S/. {formatSoles(Number(order.pending_amount) || 0)}</span></div>
                    </div>

                    <div className="border-t border-slate-800 mt-3 pt-2 text-slate-400 space-y-0.5">
                        <p>Cliente: <span className="text-white">{order.customer_name}</span></p>
                        <p>WhatsApp: <span className="text-white">{order.customer_phone}</span></p>
                        <p>Entrega: <span className="text-white font-semibold">{deliveryLabel(order.delivery_type)}</span></p>
                    </div>
                </div>

                {/* Datos de pago */}
                <div className="bg-slate-950 p-4 rounded-xl mb-5 border border-slate-800/80">
                    <PaymentInfo orderCode={order.order_code} amount={Number(order.paid_amount) || 0} isFullPayment={!!order.is_full_payment} />
                </div>

                {/* Acciones (no se imprimen) */}
                <div className="no-print flex gap-2">
                    <button onClick={() => window.print()} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-semibold transition">
                        🖨️ Imprimir / Guardar PDF
                    </button>
                    <Link href="/" className="flex-1 text-center py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition">
                        Volver al Catálogo
                    </Link>
                </div>
            </div>
        </main>
    );
}
