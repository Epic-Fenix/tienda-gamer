'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Warranty } from '@/types/database';
import { normalizePhone } from '@/lib/site';

// Calcula la fecha de vencimiento y si sigue vigente.
function warrantyExpiry(w: Warranty) {
    const months = Number(w.warranty_months) || 3;
    const start = new Date(w.created_at);
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    const active = Date.now() <= end.getTime();
    return { end, active, months };
}

export default function WarrantyManager() {
    const [warranties, setWarranties] = useState<Warranty[]>([]);
    const [query, setQuery] = useState('');

    const fetchWarranties = async () => {
        const { data } = await supabase.from('warranties').select('*').order('created_at', { ascending: false });
        if (data) setWarranties(data as Warranty[]);
    };

    useEffect(() => {
        fetchWarranties();
        const channel = supabase
            .channel('warranties-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'warranties' }, () => fetchWarranties())
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const buildWhatsappLink = (w: Warranty) => {
        const message =
            `¡Hola ${w.customer_name}! Te escribimos de SCOTT GAMES sobre tu garantía registrada` +
            (w.product ? ` de ${w.product}` : '') + `. ¿En qué podemos ayudarte?`;
        return `https://wa.me/${normalizePhone(w.customer_phone)}?text=${encodeURIComponent(message)}`;
    };

    const updateMonths = async (w: Warranty, months: number) => {
        setWarranties((prev) => prev.map((x) => (x.id === w.id ? { ...x, warranty_months: months } : x)));
        await supabase.from('warranties').update({ warranty_months: months }).eq('id', w.id);
    };

    const exportCsv = () => {
        const escape = (c: string | number | null | undefined) => `"${String(c ?? '').replace(/"/g, '""')}"`;
        const headers = ['Cliente', 'DNI', 'Celular', 'Producto', 'Meses', 'Registro', 'Vence', 'Estado'];
        const rows = warranties.map((w) => {
            const { end, active, months } = warrantyExpiry(w);
            return [
                w.customer_name, w.dni, w.customer_phone, w.product || '', months,
                new Date(w.created_at).toLocaleDateString('es-PE'),
                end.toLocaleDateString('es-PE'),
                active ? 'Vigente' : 'Vencida',
            ];
        });
        const lines = [headers, ...rows].map((r) => r.map(escape).join(','));
        const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `garantias-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const q = query.trim().toLowerCase();
    const filtered = q === ''
        ? warranties
        : warranties.filter((w) =>
            w.customer_name.toLowerCase().includes(q) ||
            w.dni.includes(q) ||
            w.customer_phone.includes(q) ||
            (w.product || '').toLowerCase().includes(q));

    const activeCount = warranties.filter((w) => warrantyExpiry(w).active).length;

    return (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Garantías registradas</h2>
                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar nombre, DNI, celular…"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 w-48"
                    />
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">{activeCount} vigentes</span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{warranties.length} total</span>
                    <button onClick={exportCsv} disabled={warranties.length === 0} className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition disabled:opacity-40">Exportar CSV</button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="text-slate-500 border-b border-slate-800 uppercase">
                        <tr>
                            <th className="pb-3">Cliente</th>
                            <th className="pb-3">DNI</th>
                            <th className="pb-3">Celular</th>
                            <th className="pb-3">Producto</th>
                            <th className="pb-3">Plazo</th>
                            <th className="pb-3">Vence</th>
                            <th className="pb-3">Estado</th>
                            <th className="pb-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                        {filtered.length === 0 && (
                            <tr><td colSpan={8} className="py-6 text-center text-slate-500">No hay garantías registradas.</td></tr>
                        )}
                        {filtered.map((w) => {
                            const { end, active, months } = warrantyExpiry(w);
                            return (
                                <tr key={w.id} className="hover:bg-slate-950/40 transition align-top">
                                    <td className="py-3 font-semibold text-white">{w.customer_name}</td>
                                    <td className="py-3 text-slate-300 font-mono">{w.dni}</td>
                                    <td className="py-3 text-slate-400">{w.customer_phone}</td>
                                    <td className="py-3 text-slate-400">{w.product || '—'}</td>
                                    <td className="py-3">
                                        <select value={months} onChange={(e) => updateMonths(w, Number(e.target.value))} className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500">
                                            <option value={3}>3 meses</option>
                                            <option value={6}>6 meses</option>
                                            <option value={12}>12 meses</option>
                                        </select>
                                    </td>
                                    <td className="py-3 text-slate-500">{end.toLocaleDateString('es-PE')}</td>
                                    <td className="py-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                            {active ? 'Vigente' : 'Vencida'}
                                        </span>
                                    </td>
                                    <td className="py-3">
                                        <div className="flex items-center justify-end">
                                            <a href={buildWhatsappLink(w)} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded font-bold transition">WhatsApp</a>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
