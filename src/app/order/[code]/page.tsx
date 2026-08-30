'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import PaymentInfo from '@/components/PaymentInfo';

export default function OrderPage({ params }: { params: Promise<{ code: string }> }) {
    const resolvedParams = use(params);
    const code = resolvedParams.code;
    const [order, setOrder] = useState<any>(null);
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            const { data: orderData } = await supabase.from('orders').select('*').eq('order_code', code).single();
            if (orderData) {
                setOrder(orderData);
                const { data: prodData } = await supabase.from('products').select('*').eq('id', orderData.product_id).single();
                if (prodData) setProduct(prodData);
            }
            setLoading(false);
        };
        fetchOrder();
    }, [code]);

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando comprobante...</div>;
    if (!order) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-rose-400">Orden no encontrada.</div>;

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
                <div className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold mb-3">
                    Reserva Confirmada
                </div>
                <h1 className="text-xl font-black text-white mb-1">Boleta de Separación</h1>
                <p className="text-xs text-slate-400 mb-6">Código: <span className="font-mono text-indigo-400 font-bold">{order.order_code}</span></p>

                <div className="bg-white p-4 rounded-xl inline-block mb-6">
                    <QRCodeSVG value={`https://tu-dominio.vercel.app/admin/verify/${order.order_code}`} size={160} />
                </div>

                <div className="bg-slate-950 p-4 rounded-xl text-left text-xs space-y-2 mb-6 border border-slate-800/80">
                    {Array.isArray(order.items) && order.items.length > 0 ? (
                        <div className="space-y-1">
                            <p className="text-slate-500 uppercase text-[10px] font-bold tracking-wider mb-1">Productos ({order.items.length})</p>
                            {order.items.map((it: { product_id: string; name: string; quantity: number; price: number }) => (
                                <div key={it.product_id} className="flex justify-between gap-2">
                                    <span className="text-white">{it.quantity}× {it.name}</span>
                                    <span className="text-slate-400">S/. {(it.price * it.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400">Producto: <span className="text-white font-semibold">{product?.name}</span></p>
                    )}
                    <p className="text-slate-400">Cliente: <span className="text-white">{order.customer_name}</span></p>
                    <p className="text-slate-400">Entrega: <span className="text-white uppercase font-semibold">{order.delivery_type === 'pickup' ? 'Recojo en Local' : 'Envío'}</span></p>
                    <div className="border-t border-slate-800 pt-2 flex justify-between font-bold">
                        <span className="text-emerald-400">Abono Separación:</span>
                        <span>S/. {order.paid_amount}</span>
                    </div>
                    <div className="flex justify-between font-bold text-amber-400">
                        <span>Saldo a Pagar:</span>
                        <span>S/. {order.pending_amount}</span>
                    </div>
                </div>

                {/* Datos de pago Yape / Plin / Transferencias */}
                <div className="bg-slate-950 p-4 rounded-xl mb-6 border border-slate-800/80">
                    <PaymentInfo orderCode={order.order_code} amount={Number(order.paid_amount) || 0} />
                </div>

                <Link href="/" className="block w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition">
                    Volver al Catálogo
                </Link>
            </div>
        </main>
    );
}