'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types/database';
import { useRouter } from 'next/navigation';

interface Props {
    product: Product;
    onClose: () => void;
}

export default function ReservationModal({ product, onClose }: Props) {
    const router = useRouter();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [deliveryType, setDeliveryType] = useState('pickup');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);

    const reservationAmount = Number(((product.price * product.min_reservation_pct) / 100).toFixed(2));
    const pendingAmount = Number((product.price - reservationAmount).toFixed(2));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const orderCode = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + 48);

        const { error } = await supabase.from('orders').insert({
            order_code: orderCode,
            product_id: product.id,
            customer_name: name,
            customer_phone: phone,
            customer_email: email.trim() !== '' ? email.trim() : null,
            delivery_type: deliveryType,
            shipping_address: deliveryType === 'shipping' ? address : null,
            total_amount: product.price,
            paid_amount: reservationAmount,
            pending_amount: pendingAmount,
            pickup_deadline: deadline.toISOString(),
            status: 'reserved'
        });

        if (error) {
            alert('Error al generar la separación: ' + error.message);
            setLoading(false);
            return;
        }

        router.push(`/order/${orderCode}`);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-1">Separar {product.name}</h2>
                <p className="text-xs text-slate-400 mb-4">Asegura tu producto con el {product.min_reservation_pct}% de adelanto.</p>

                <div className="bg-slate-950 p-3 rounded-lg mb-4 text-xs space-y-1 text-slate-300">
                    <div className="flex justify-between"><span>Precio total:</span> <span className="font-bold">S/. {product.price}</span></div>
                    <div className="flex justify-between text-indigo-400"><span>Monto a separar ({product.min_reservation_pct}%):</span> <span className="font-bold">S/. {reservationAmount}</span></div>
                    <div className="flex justify-between text-slate-400"><span>Saldo pendiente:</span> <span>S/. {pendingAmount}</span></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Nombre Completo *</label>
                        <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. Juan Perez" />
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 block mb-1">WhatsApp / Celular *</label>
                        <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. 987654321" />
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 block mb-1 flex justify-between">
                            <span>Correo Electrónico</span>
                            <span className="text-slate-500 text-[10px]">(Opcional - para promociones)</span>
                        </label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="ejemplo@correo.com" />
                    </div>

                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Tipo de Entrega</label>
                        <select value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                            <option value="pickup">Recojo en Tienda Física</option>
                            <option value="shipping">Envío a Domicilio</option>
                        </select>
                    </div>

                    {deliveryType === 'shipping' && (
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">Dirección de Envío *</label>
                            <input required type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Distrito, Calle, Número" />
                        </div>
                    )}

                    <div className="flex gap-2 pt-3">
                        <button type="button" onClick={onClose} className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition">Cancelar</button>
                        <button type="submit" disabled={loading} className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition disabled:opacity-50">
                            {loading ? 'Generando...' : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}