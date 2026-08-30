'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Coupon, DiscountType } from '@/types/database';

export default function CouponManager() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [code, setCode] = useState('');
    const [discountType, setDiscountType] = useState<DiscountType>('percent');
    const [discountValue, setDiscountValue] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchCoupons = async () => {
        const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
        if (data) setCoupons(data as Coupon[]);
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const normalized = code.trim().toUpperCase();
        if (normalized === '') return;
        setSaving(true);
        const { error } = await supabase.from('coupons').insert({
            code: normalized,
            discount_type: discountType,
            discount_value: Number(discountValue) || 0,
            is_active: true,
        });
        if (error) {
            alert('Error al crear cupón: ' + error.message + (error.message.includes('duplicate') ? '\n(Ese código ya existe)' : ''));
        } else {
            setCode('');
            setDiscountValue('');
            setDiscountType('percent');
            fetchCoupons();
        }
        setSaving(false);
    };

    const toggleActive = async (c: Coupon) => {
        setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, is_active: !x.is_active } : x)));
        await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id);
    };

    const remove = async (c: Coupon) => {
        if (!confirm(`¿Eliminar el cupón ${c.code}?`)) return;
        setCoupons((prev) => prev.filter((x) => x.id !== c.id));
        await supabase.from('coupons').delete().eq('id', c.id);
    };

    return (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Cupones de Descuento</h2>

            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2 mb-4 text-xs">
                <div>
                    <label className="text-slate-400 block mb-1">Código</label>
                    <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required className="w-36 bg-slate-950 border border-slate-800 rounded-lg p-2 text-white uppercase" placeholder="GAMER10" />
                </div>
                <div>
                    <label className="text-slate-400 block mb-1">Tipo</label>
                    <select value={discountType} onChange={(e) => setDiscountType(e.target.value as DiscountType)} className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-white">
                        <option value="percent">Porcentaje (%)</option>
                        <option value="fixed">Monto fijo (S/.)</option>
                    </select>
                </div>
                <div>
                    <label className="text-slate-400 block mb-1">Valor</label>
                    <input type="number" step="0.01" min="0" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} required className="w-24 bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" placeholder={discountType === 'percent' ? '10' : '50'} />
                </div>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition disabled:opacity-50">
                    {saving ? 'Creando...' : 'Crear cupón'}
                </button>
            </form>

            {coupons.length === 0 ? (
                <p className="text-xs text-slate-500">No hay cupones registrados.</p>
            ) : (
                <div className="space-y-2">
                    {coupons.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3">
                            <span className="font-mono font-bold text-indigo-400 text-sm">{c.code}</span>
                            <span className="text-xs text-slate-300">
                                {c.discount_type === 'percent' ? `${c.discount_value}% de descuento` : `S/. ${Number(c.discount_value).toFixed(2)} de descuento`}
                            </span>
                            <button onClick={() => toggleActive(c)} className={`ml-auto px-2 py-1 rounded text-[10px] font-bold transition ${c.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                                {c.is_active ? 'Activo' : 'Inactivo'}
                            </button>
                            <button onClick={() => remove(c)} className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded text-xs font-bold transition">Eliminar</button>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
