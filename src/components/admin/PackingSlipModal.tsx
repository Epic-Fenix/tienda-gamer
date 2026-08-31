'use client';

import { Order, OrderItem } from '@/types/database';
import { STORE, orderUrl } from '@/lib/site';
import { QRCodeSVG } from 'qrcode.react';

interface Props {
    order: Order;
    onClose: () => void;
}

export default function PackingSlipModal({ order, onClose }: Props) {
    const items: OrderItem[] = Array.isArray(order.items) ? order.items : [];
    const isShipping = order.delivery_type === 'shipping';
    const date = order.created_at ? new Date(order.created_at).toLocaleDateString('es-PE') : '';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 overflow-y-auto">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm no-print" onClick={onClose} />

            {/* Aísla la etiqueta al imprimir: oculta todo lo demás y fija el tamaño 10x15 cm */}
            <style>{`
                @media print {
                    body * { visibility: hidden !important; }
                    #packing-slip, #packing-slip * { visibility: visible !important; }
                    #packing-slip { position: fixed; left: 0; top: 0; margin: 0 !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; width: 100mm; height: 150mm; }
                    @page { size: 100mm 150mm; margin: 4mm; }
                }
            `}</style>

            <div className="relative my-4">
                {/* Etiqueta 10x15 cm */}
                <div
                    id="packing-slip"
                    style={{ width: '100mm', minHeight: '150mm' }}
                    className="bg-white text-black rounded-lg p-4 flex flex-col gap-2 shadow-2xl"
                >
                    {/* Encabezado */}
                    <div className="flex items-start justify-between border-b-2 border-black pb-2">
                        <div>
                            <p className="text-lg font-black leading-none">{STORE.name}</p>
                            <p className="text-[9px] leading-tight mt-0.5">{STORE.address}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] uppercase font-bold">Etiqueta de envío</p>
                            <p className="text-[9px]">{date}</p>
                        </div>
                    </div>

                    {/* Código de pedido */}
                    <div className="text-center bg-black text-white rounded py-1">
                        <span className="font-mono font-black tracking-wider text-sm">{order.order_code}</span>
                    </div>

                    {/* Destinatario */}
                    <div className="text-xs">
                        <p className="text-[9px] uppercase font-bold text-gray-500">Destinatario</p>
                        <p className="font-bold text-sm leading-tight">{order.customer_name}</p>
                        <p className="leading-tight">Tel/WhatsApp: {order.customer_phone}</p>
                    </div>

                    {/* Entrega */}
                    <div className="text-xs border border-black rounded p-2">
                        <p className="text-[9px] uppercase font-bold text-gray-500">Modalidad de entrega</p>
                        {isShipping ? (
                            <>
                                <p className="font-bold">ENVÍO A DOMICILIO</p>
                                <p className="leading-tight">{order.shipping_address || 'Dirección no registrada'}</p>
                            </>
                        ) : (
                            <p className="font-bold">RECOJO EN TIENDA</p>
                        )}
                    </div>

                    {/* Productos */}
                    <div className="text-xs flex-1">
                        <p className="text-[9px] uppercase font-bold text-gray-500 mb-1">Productos</p>
                        <div className="space-y-0.5">
                            {items.length > 0 ? (
                                items.map((it) => (
                                    <div key={it.product_id} className="flex justify-between gap-2 border-b border-dashed border-gray-300 pb-0.5">
                                        <span className="font-semibold">{it.quantity}×</span>
                                        <span className="flex-1">{it.name}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="border-b border-dashed border-gray-300 pb-0.5">1× Pedido de 1 producto</div>
                            )}
                        </div>
                    </div>

                    {/* Pie: estado de pago + QR */}
                    <div className="flex items-end justify-between border-t-2 border-black pt-2">
                        <div className="text-[10px]">
                            <p className="font-bold">{order.is_full_payment ? 'PAGO TOTAL' : 'SEPARACIÓN'}</p>
                            <p>Abonado: S/. {(Number(order.paid_amount) || 0).toFixed(2)}</p>
                            <p className="font-bold">Saldo: S/. {(Number(order.pending_amount) || 0).toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                            <QRCodeSVG value={orderUrl(order.order_code)} size={70} />
                            <p className="text-[7px] mt-0.5">Escanea para seguimiento</p>
                        </div>
                    </div>
                </div>

                {/* Acciones (no se imprimen) */}
                <div className="no-print flex gap-2 mt-3">
                    <button onClick={() => window.print()} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition">
                        🖨️ Imprimir etiqueta
                    </button>
                    <button onClick={onClose} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold transition">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
