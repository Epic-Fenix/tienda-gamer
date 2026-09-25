'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { STORE } from '@/lib/site';
import LogoScott from '@/components/LogoScott';

export default function GarantiaPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [dni, setDni] = useState('');
    const [phone, setPhone] = useState('');
    const [product, setProduct] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!/^\d{8}$/.test(dni.trim())) { setError('El DNI debe tener 8 dígitos.'); return; }
        if (phone.replace(/\D/g, '').length < 9) { setError('Ingresa un celular válido (9 dígitos).'); return; }
        setLoading(true);
        const { error: err } = await supabase.from('warranties').insert({
            customer_name: name.trim(),
            dni: dni.trim(),
            customer_phone: phone.trim(),
            product: product.trim() !== '' ? product.trim() : null,
        });
        setLoading(false);
        if (err) { setError('No se pudo registrar. Intenta de nuevo.'); return; }
        setDone(true);
        // Redirige al catálogo tras unos segundos.
        setTimeout(() => router.push('/'), 4000);
    };

    return (
        <main className="min-h-screen bg-[#08080c] bg-[radial-gradient(120%_80%_at_50%_-10%,#15151f_0%,#08080c_55%)] text-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#12121a] border border-[#242430] rounded-2xl p-6 shadow-2xl">
                <div className="flex justify-center mb-4"><LogoScott /></div>

                {done ? (
                    <div className="text-center py-6 space-y-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-3xl">✓</div>
                        <h1 className="font-gamer text-xl font-black text-white">¡Garantía registrada!</h1>
                        <p className="text-sm text-slate-400">Tus datos quedaron guardados. {STORE.name} asumirá tu garantía según el plazo indicado.</p>
                        <p className="text-xs text-slate-500">Te llevamos a la tienda en unos segundos…</p>
                        <Link href="/" className="inline-block px-6 py-3 rounded-xl text-sm font-black bg-[#fcd34d] text-zinc-950 hover:bg-[#fbbf24] transition">Ir a la tienda</Link>
                    </div>
                ) : (
                    <>
                        <h1 className="font-gamer text-xl font-black text-white text-center">Registro de Garantía</h1>
                        <p className="text-xs text-slate-400 text-center mt-1 mb-4">¿Perdiste tu tarjeta de garantía? Regístrate aquí y quedarás en nuestra base para hacerla válida.</p>

                        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Nombre completo *</label>
                                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#0b0b12] border border-[#242430] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#22d3ee]" placeholder="Ej. Juan Pérez García" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">DNI *</label>
                                <input required inputMode="numeric" maxLength={8} value={dni} onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))} className="w-full bg-[#0b0b12] border border-[#242430] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#22d3ee]" placeholder="8 dígitos" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Celular / WhatsApp *</label>
                                <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-[#0b0b12] border border-[#242430] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#22d3ee]" placeholder="Ej. 987654321" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1 flex justify-between"><span>Producto</span><span className="text-slate-500 text-[10px]">(opcional)</span></label>
                                <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} className="w-full bg-[#0b0b12] border border-[#242430] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#22d3ee]" placeholder="Ej. PS5 Slim / God of War" />
                            </div>

                            {error && <p className="text-xs text-rose-400">{error}</p>}

                            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-sm font-black bg-[#fcd34d] text-zinc-950 hover:bg-[#fbbf24] transition disabled:opacity-50">
                                {loading ? 'Registrando…' : 'Registrar mi garantía'}
                            </button>
                            <p className="text-[10px] text-slate-500 text-center">
                                Al registrar aceptas nuestra <a href="/privacidad" target="_blank" className="text-[#22d3ee] hover:underline">Política de Privacidad</a>.
                            </p>
                        </form>
                    </>
                )}
            </div>
        </main>
    );
}
