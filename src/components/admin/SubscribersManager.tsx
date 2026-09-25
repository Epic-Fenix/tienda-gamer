'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Subscriber } from '@/types/database';

export default function SubscribersManager() {
    const [subs, setSubs] = useState<Subscriber[]>([]);
    const [query, setQuery] = useState('');

    const fetchSubs = async () => {
        const { data } = await supabase.from('subscribers').select('*').order('created_at', { ascending: false });
        if (data) setSubs(data as Subscriber[]);
    };

    useEffect(() => {
        fetchSubs();
        const channel = supabase
            .channel('subscribers-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'subscribers' }, () => fetchSubs())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const remove = async (id: string) => {
        if (!window.confirm('¿Eliminar este suscriptor?')) return;
        setSubs((prev) => prev.filter((s) => s.id !== id));
        await supabase.from('subscribers').delete().eq('id', id);
    };

    const exportCsv = () => {
        const escape = (c: string | number | null | undefined) => `"${String(c ?? '').replace(/"/g, '""')}"`;
        const headers = ['Correo', 'Nombre', 'Origen', 'Consentimiento', 'Fecha'];
        const rows = subs.map((s) => [
            s.email, s.name || '', s.source || '', s.consent ? 'Sí' : 'No',
            new Date(s.created_at).toLocaleDateString('es-PE'),
        ]);
        const lines = [headers, ...rows].map((r) => r.map(escape).join(','));
        const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `suscriptores-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const q = query.trim().toLowerCase();
    const filtered = q === '' ? subs : subs.filter((s) => s.email.toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q));

    return (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Suscriptores (marketing)</h2>
                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar correo o nombre…"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 w-48"
                    />
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{subs.length} correos</span>
                    <button onClick={exportCsv} disabled={subs.length === 0} className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition disabled:opacity-40">Exportar CSV</button>
                </div>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">Correos con consentimiento para recibir novedades. Usa el CSV en tu herramienta de correo (Mailchimp, Brevo, etc.).</p>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="text-slate-500 border-b border-slate-800 uppercase">
                        <tr>
                            <th className="pb-3 pr-4">Correo</th>
                            <th className="pb-3 pr-4">Nombre</th>
                            <th className="pb-3 pr-4">Origen</th>
                            <th className="pb-3 pr-4">Fecha</th>
                            <th className="pb-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                        {filtered.length === 0 && (
                            <tr><td colSpan={5} className="py-6 text-center text-slate-500">No hay suscriptores todavía.</td></tr>
                        )}
                        {filtered.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-950/40 transition align-top">
                                <td className="py-3 pr-4 font-semibold text-white whitespace-nowrap">{s.email}</td>
                                <td className="py-3 pr-4 text-slate-400">{s.name || '—'}</td>
                                <td className="py-3 pr-4 text-slate-400">{s.source || '—'}</td>
                                <td className="py-3 pr-4 text-slate-500 whitespace-nowrap">{new Date(s.created_at).toLocaleDateString('es-PE')}</td>
                                <td className="py-3">
                                    <div className="flex items-center justify-end">
                                        <button onClick={() => remove(s.id)} className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded font-bold transition">Eliminar</button>
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
