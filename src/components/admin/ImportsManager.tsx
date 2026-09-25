'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ImportOrder, ImportStatus } from '@/types/database';

const STATUS_META: Record<string, { label: string; cls: string }> = {
    pedido: { label: 'Pedido', cls: 'bg-amber-500/10 text-amber-400' },
    en_camino: { label: 'En camino', cls: 'bg-sky-500/10 text-sky-400' },
    recibido: { label: 'Recibido', cls: 'bg-emerald-500/10 text-emerald-400' },
};

const EMPTY = { title: '', supplier: '', quantity: '1', cost_yen: '', cost_soles: '', tracking: '', notes: '' };

export default function ImportsManager() {
    const [imports, setImports] = useState<ImportOrder[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ ...EMPTY });
    const [saving, setSaving] = useState(false);

    const fetchImports = async () => {
        const { data } = await supabase.from('imports').select('*').order('created_at', { ascending: false });
        if (data) setImports(data as ImportOrder[]);
    };

    useEffect(() => {
        fetchImports();
        const channel = supabase
            .channel('imports-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'imports' }, () => fetchImports())
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { error } = await supabase.from('imports').insert({
            title: form.title.trim(),
            supplier: form.supplier.trim() || null,
            quantity: Number(form.quantity) || 1,
            cost_yen: form.cost_yen.trim() !== '' ? Number(form.cost_yen) : null,
            cost_soles: form.cost_soles.trim() !== '' ? Number(form.cost_soles) : null,
            tracking: form.tracking.trim() || null,
            notes: form.notes.trim() || null,
            status: 'pedido',
        });
        setSaving(false);
        if (error) { alert('Error al registrar la importación: ' + error.message); return; }
        setForm({ ...EMPTY });
        setShowForm(false);
    };

    const updateStatus = async (imp: ImportOrder, status: ImportStatus) => {
        setImports((prev) => prev.map((x) => (x.id === imp.id ? { ...x, status } : x)));
        await supabase.from('imports').update({ status }).eq('id', imp.id);
    };

    const remove = async (id: string) => {
        if (!window.confirm('¿Eliminar esta importación?')) return;
        setImports((prev) => prev.filter((x) => x.id !== id));
        await supabase.from('imports').delete().eq('id', id);
    };

    const pending = imports.filter((i) => i.status !== 'recibido').length;

    return (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Importaciones / Pedidos de Japón</h2>
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20">{pending} en curso</span>
                    <button onClick={() => setShowForm((v) => !v)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition">
                        {showForm ? 'Cerrar' : '+ Nueva importación'}
                    </button>
                </div>
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="sm:col-span-2">
                        <label className="text-slate-400 block mb-1">¿Qué se pidió? *</label>
                        <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. PS5 Slim + God of War Ragnarok" />
                    </div>
                    <div>
                        <label className="text-slate-400 block mb-1">Proveedor / tienda</label>
                        <input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. Mercari, Amazon JP" />
                    </div>
                    <div>
                        <label className="text-slate-400 block mb-1">Cantidad</label>
                        <input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                        <label className="text-slate-400 block mb-1">Costo (¥ yen)</label>
                        <input type="number" step="0.01" value={form.cost_yen} onChange={(e) => setForm({ ...form, cost_yen: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500" placeholder="Opcional" />
                    </div>
                    <div>
                        <label className="text-slate-400 block mb-1">Costo (S/. soles)</label>
                        <input type="number" step="0.01" value={form.cost_soles} onChange={(e) => setForm({ ...form, cost_soles: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500" placeholder="Opcional" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-slate-400 block mb-1">N° de seguimiento</label>
                        <input value={form.tracking} onChange={(e) => setForm({ ...form, tracking: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500" placeholder="Tracking / guía" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-slate-400 block mb-1">Notas</label>
                        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div className="sm:col-span-2 flex justify-end">
                        <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition disabled:opacity-50">
                            {saving ? 'Guardando…' : 'Registrar'}
                        </button>
                    </div>
                </form>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="text-slate-500 border-b border-slate-800 uppercase">
                        <tr>
                            <th className="pb-3">Pedido</th>
                            <th className="pb-3">Proveedor</th>
                            <th className="pb-3">Cant.</th>
                            <th className="pb-3">Costo</th>
                            <th className="pb-3">Tracking</th>
                            <th className="pb-3">Estado</th>
                            <th className="pb-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                        {imports.length === 0 && (
                            <tr><td colSpan={7} className="py-6 text-center text-slate-500">No hay importaciones registradas.</td></tr>
                        )}
                        {imports.map((imp) => {
                            const meta = STATUS_META[imp.status] ?? STATUS_META.pedido;
                            const cost = imp.cost_soles != null ? `S/. ${imp.cost_soles}` : imp.cost_yen != null ? `¥ ${imp.cost_yen}` : '—';
                            return (
                                <tr key={imp.id} className="hover:bg-slate-950/40 transition align-top">
                                    <td className="py-3 font-semibold text-white max-w-[220px]">
                                        {imp.title}
                                        {imp.notes && <span className="block text-[10px] text-slate-500 font-normal">{imp.notes}</span>}
                                    </td>
                                    <td className="py-3 text-slate-400">{imp.supplier || '—'}</td>
                                    <td className="py-3 text-slate-300">{imp.quantity}</td>
                                    <td className="py-3 text-slate-300">{cost}</td>
                                    <td className="py-3 text-slate-400 max-w-[120px] truncate">{imp.tracking || '—'}</td>
                                    <td className="py-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${meta.cls}`}>{meta.label}</span>
                                    </td>
                                    <td className="py-3">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button onClick={() => updateStatus(imp, 'en_camino')} disabled={imp.status !== 'pedido'} className="px-2 py-1 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white rounded font-bold transition disabled:opacity-30 disabled:cursor-not-allowed">En camino</button>
                                            <button onClick={() => updateStatus(imp, 'recibido')} disabled={imp.status === 'recibido'} className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded font-bold transition disabled:opacity-30 disabled:cursor-not-allowed">Recibido</button>
                                            <button onClick={() => remove(imp.id)} className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded font-bold transition">✕</button>
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
