'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types/database';

interface Props {
    product: Product;
    onClose: () => void;
}

export default function BackorderModal({ product, onClose }: Props) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.from('backorders').insert({
            product_id: product.id,
            customer_name: name,
            customer_phone: phone,
            customer_email: email.trim() !== '' ? email.trim() : null,
            status: 'pending'
        });

        setLoading(false);
        if (error) {
            alert('Error al registrar encargo: ' + error.message);
        } else {
            setSent(true);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                {sent ? (
                    <div className="text-center py-4 space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-2xl font-bold">
                            ✓
                        </div>
                        <h3 className="text-lg font-bold text-white">¡Encargo Registrado!</h3>
                        <p className="text-xs text-slate-400">
                            Te avisaremos por WhatsApp en cuanto tengamos nuevas unidades de <strong className="text-white">{product.name}</strong>.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
                        >
                            Entendido
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-lg font-bold text-white mb-1">Encargar Producto Agotado</h2>
                        <p className="text-xs text-slate-400 mb-4">
                            Ingresa tus datos para avisarte con prioridad cuando ingrese stock de <strong className="text-white">{product.name}</strong>.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                            <div>
                                <label className="text-slate-400 block mb-1">Nombre Completo *</label>
                                <input
                                    required
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                                    placeholder="Ej. Mario Bros"
                                />
                            </div>

                            <div>
                                <label className="text-slate-400 block mb-1">WhatsApp / Celular *</label>
                                <input
                                    required
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                                    placeholder="Ej. 987654321"
                                />
                            </div>

                            <div>
                                <label className="text-slate-400 block mb-1 flex justify-between">
                                    <span>Correo Electrónico</span>
                                    <span className="text-slate-500 text-[10px]">(Opcional)</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                                    placeholder="ejemplo@correo.com"
                                />
                            </div>

                            <div className="flex gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition disabled:opacity-50"
                                >
                                    {loading ? 'Anotando...' : 'Anotarme en Lista'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}