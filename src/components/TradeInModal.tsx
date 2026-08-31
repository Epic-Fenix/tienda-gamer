'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
    onClose: () => void;
}

export default function TradeInModal({ onClose }: Props) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [offered, setOffered] = useState('');
    const [wanted, setWanted] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase.from('trade_ins').insert({
            customer_name: name,
            customer_phone: phone,
            offered_item: offered,
            wanted_item: wanted.trim() !== '' ? wanted.trim() : null,
            status: 'pending',
        });
        setLoading(false);
        if (error) {
            alert('Error al enviar tu solicitud: ' + error.message);
        } else {
            setSent(true);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                {sent ? (
                    <div className="text-center py-4 space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-2xl font-bold">✓</div>
                        <h3 className="text-lg font-bold text-white">¡Solicitud enviada!</h3>
                        <p className="text-xs text-slate-400">Revisaremos tu artículo y te contactaremos por WhatsApp con una propuesta.</p>
                        <button onClick={onClose} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition">Entendido</button>
                    </div>
                ) : (
                    <>
                        <div className="flex items-start justify-between mb-1">
                            <h2 className="text-lg font-bold text-white">🔁 Trae tu usado</h2>
                            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">×</button>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">Trae tu juego o consola, danos los datos y paga solo la diferencia por lo que quieres llevarte.</p>

                        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                            <div>
                                <label className="text-slate-400 block mb-1">Nombre completo *</label>
                                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" placeholder="Ej. Carlos Chafloque" />
                            </div>
                            <div>
                                <label className="text-slate-400 block mb-1">WhatsApp / Celular *</label>
                                <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" placeholder="Ej. 987654321" />
                            </div>
                            <div>
                                <label className="text-slate-400 block mb-1">¿Qué artículo ofreces? *</label>
                                <textarea required value={offered} onChange={(e) => setOffered(e.target.value)} rows={2} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white resize-none" placeholder="Ej. PS4 Slim 1TB con 2 mandos y 3 juegos, buen estado" />
                            </div>
                            <div>
                                <label className="text-slate-400 block mb-1">¿Qué te gustaría llevar? (opcional)</label>
                                <input type="text" value={wanted} onChange={(e) => setWanted(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" placeholder="Ej. PS5 Slim" />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="button" onClick={onClose} className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition">Cancelar</button>
                                <button type="submit" disabled={loading} className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition disabled:opacity-50">
                                    {loading ? 'Enviando...' : 'Enviar propuesta'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
