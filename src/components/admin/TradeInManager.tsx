'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TradeIn, TradeInStatus } from '@/types/database';

export default function TradeInManager() {
    const [tradeIns, setTradeIns] = useState<TradeIn[]>([]);

    const fetchTradeIns = async () => {
        const { data } = await supabase.from('trade_ins').select('*').order('created_at', { ascending: false });
        if (data) setTradeIns(data as TradeIn[]);
    };

    useEffect(() => {
        fetchTradeIns();
        const channel = supabase
            .channel('trade-ins-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_ins' }, () => fetchTradeIns())
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const buildWhatsappLink = (t: TradeIn) => {
        const digits = (t.customer_phone || '').replace(/\D/g, '');
        const local = digits.startsWith('51') && digits.length > 9 ? digits.slice(2) : digits;
        const message =
            `¡Hola ${t.customer_name}! Te escribimos de SCOTT GAMES por tu solicitud de trueque. ` +
            `Nos ofreces: ${t.offered_item}.` + (t.wanted_item ? ` Buscas: ${t.wanted_item}.` : '') +
            ` Queremos coordinar la valorización de tu artículo. ¿Te parece?`;
        return `https://wa.me/51${local}?text=${encodeURIComponent(message)}`;
    };

    const updateStatus = async (t: TradeIn, status: TradeInStatus) => {
        setTradeIns((prev) => prev.map((x) => (x.id === t.id ? { ...x, status } : x)));
        await supabase.from('trade_ins').update({ status }).eq('id', t.id);
    };

    return (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Solicitudes de Trueque (Trade-in)</h2>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                    {tradeIns.filter((t) => t.status === 'pending').length} pendientes
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="text-slate-500 border-b border-slate-800 uppercase">
                        <tr>
                            <th className="pb-3">Cliente</th>
                            <th className="pb-3">Teléfono</th>
                            <th className="pb-3">Ofrece</th>
                            <th className="pb-3">Busca</th>
                            <th className="pb-3">Estado</th>
                            <th className="pb-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                        {tradeIns.length === 0 && (
                            <tr><td colSpan={6} className="py-6 text-center text-slate-500">No hay solicitudes de trueque.</td></tr>
                        )}
                        {tradeIns.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-950/40 transition align-top">
                                <td className="py-3 font-semibold text-white">{t.customer_name}</td>
                                <td className="py-3 text-slate-400">{t.customer_phone}</td>
                                <td className="py-3 text-slate-300 max-w-[180px]">{t.offered_item}</td>
                                <td className="py-3 text-slate-400">{t.wanted_item || '—'}</td>
                                <td className="py-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.status === 'closed' ? 'bg-emerald-500/10 text-emerald-400' : t.status === 'contacted' ? 'bg-sky-500/10 text-sky-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                        {t.status === 'closed' ? 'Cerrado' : t.status === 'contacted' ? 'Contactado' : 'Pendiente'}
                                    </span>
                                </td>
                                <td className="py-3">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <a href={buildWhatsappLink(t)} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded font-bold transition">WhatsApp</a>
                                        <button onClick={() => updateStatus(t, 'contacted')} disabled={t.status === 'contacted' || t.status === 'closed'} className="px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white rounded font-bold transition disabled:opacity-30 disabled:cursor-not-allowed">Contactado</button>
                                        <button onClick={() => updateStatus(t, 'closed')} disabled={t.status === 'closed'} className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded font-bold transition disabled:opacity-30 disabled:cursor-not-allowed">Cerrar</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
