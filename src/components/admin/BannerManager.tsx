'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Banner } from '@/types/database';

const emptyForm = { title: '', subtitle: '', image_url: '', button_text: '', link_url: '', is_active: true };

export default function BannerManager() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [form, setForm] = useState({ ...emptyForm });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const fetchBanners = async () => {
        const { data } = await supabase.from('banners').select('*').order('order_index', { ascending: true });
        if (data) setBanners(data as Banner[]);
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const uploadImage = async (file: File) => {
        setUploading(true);
        try {
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { error } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false });
            if (error) {
                alert('Error al subir la imagen: ' + error.message);
                return;
            }
            const { data } = supabase.storage.from('product-images').getPublicUrl(path);
            setForm((f) => ({ ...f, image_url: data.publicUrl }));
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setForm({ ...emptyForm });
        setEditingId(null);
        setShowForm(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload = {
            title: form.title,
            subtitle: form.subtitle.trim() || null,
            image_url: form.image_url.trim() || null,
            button_text: form.button_text.trim() || null,
            link_url: form.link_url.trim() || null,
            is_active: form.is_active,
        };

        if (editingId) {
            const { error } = await supabase.from('banners').update(payload).eq('id', editingId);
            if (error) alert('Error al actualizar: ' + error.message);
        } else {
            const nextIndex = banners.length > 0 ? Math.max(...banners.map((b) => b.order_index)) + 1 : 0;
            const { error } = await supabase.from('banners').insert({ ...payload, order_index: nextIndex });
            if (error) alert('Error al crear: ' + error.message);
        }
        setSaving(false);
        resetForm();
        fetchBanners();
    };

    const startEdit = (b: Banner) => {
        setEditingId(b.id);
        setForm({
            title: b.title,
            subtitle: b.subtitle ?? '',
            image_url: b.image_url ?? '',
            button_text: b.button_text ?? '',
            link_url: b.link_url ?? '',
            is_active: b.is_active,
        });
        setShowForm(true);
    };

    const toggleActive = async (b: Banner) => {
        setBanners((prev) => prev.map((x) => (x.id === b.id ? { ...x, is_active: !x.is_active } : x)));
        await supabase.from('banners').update({ is_active: !b.is_active }).eq('id', b.id);
    };

    const remove = async (b: Banner) => {
        if (!confirm(`¿Eliminar el banner "${b.title}"?`)) return;
        setBanners((prev) => prev.filter((x) => x.id !== b.id));
        await supabase.from('banners').delete().eq('id', b.id);
    };

    // Intercambia el order_index con el vecino (reordenar).
    const move = async (index: number, dir: -1 | 1) => {
        const target = index + dir;
        if (target < 0 || target >= banners.length) return;
        const a = banners[index];
        const b = banners[target];
        setBanners((prev) => {
            const copy = [...prev];
            [copy[index], copy[target]] = [copy[target], copy[index]];
            return copy;
        });
        await supabase.from('banners').update({ order_index: b.order_index }).eq('id', a.id);
        await supabase.from('banners').update({ order_index: a.order_index }).eq('id', b.id);
        fetchBanners();
    };

    return (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Banners del Carrusel</h2>
                <button onClick={() => (showForm ? resetForm() : setShowForm(true))} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition">
                    {showForm ? 'Cerrar' : '+ Nuevo Banner'}
                </button>
            </div>

            {banners.length === 0 && (
                <p className="text-xs text-slate-500 mb-4">No hay banners. La portada usa los banners por defecto hasta que agregues uno activo.</p>
            )}

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                            <label className="text-slate-400 block mb-1">Título *</label>
                            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white" placeholder="¡Nuevos ingresos PS5!" />
                        </div>
                        <div>
                            <label className="text-slate-400 block mb-1">Subtítulo</label>
                            <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white" placeholder="Descripción corta" />
                        </div>
                        <div>
                            <label className="text-slate-400 block mb-1">Texto del botón</label>
                            <input value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white" placeholder="Ver más" />
                        </div>
                        <div>
                            <label className="text-slate-400 block mb-1">Enlace del botón</label>
                            <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white" placeholder="https://..." />
                        </div>
                    </div>
                    <div>
                        <label className="text-slate-400 block mb-1">Imagen de fondo (opcional)</label>
                        <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white" placeholder="Pega una URL o sube un archivo ↓" />
                        <div className="flex items-center gap-2 mt-2">
                            <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} className="text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-indigo-600/30 file:text-indigo-300 file:text-[11px] file:font-bold hover:file:bg-indigo-600 hover:file:text-white" />
                            {uploading && <span className="text-[11px] text-amber-400">Subiendo...</span>}
                            {form.image_url && !uploading && <img src={form.image_url} alt="preview" className="w-10 h-7 object-cover rounded border border-slate-700" />}
                        </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-4 h-4 accent-indigo-600" />
                        <span className="text-slate-400">Activo (visible en la portada)</span>
                    </label>
                    <div className="flex gap-2 pt-1">
                        <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition">Cancelar</button>
                        <button type="submit" disabled={saving || uploading} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition disabled:opacity-50">
                            {uploading ? 'Subiendo imagen...' : saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear banner'}
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-2">
                {banners.map((b, i) => (
                    <div key={b.id} className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3">
                        <div className="flex flex-col gap-0.5">
                            <button onClick={() => move(i, -1)} disabled={i === 0} className="w-6 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs disabled:opacity-30 disabled:cursor-not-allowed">▲</button>
                            <button onClick={() => move(i, 1)} disabled={i === banners.length - 1} className="w-6 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs disabled:opacity-30 disabled:cursor-not-allowed">▼</button>
                        </div>
                        <div className="w-14 h-9 rounded bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                            {b.image_url ? <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" /> : <span className="text-[8px] text-slate-500">Sin img</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{b.title}</p>
                            <p className="text-[11px] text-slate-500 truncate">{b.subtitle || '—'}</p>
                        </div>
                        <button onClick={() => toggleActive(b)} className={`px-2 py-1 rounded text-[10px] font-bold transition ${b.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                            {b.is_active ? 'Activo' : 'Inactivo'}
                        </button>
                        <button onClick={() => startEdit(b)} className="px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white rounded text-xs font-bold transition">Editar</button>
                        <button onClick={() => remove(b)} className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded text-xs font-bold transition">Eliminar</button>
                    </div>
                ))}
            </div>
        </section>
    );
}
