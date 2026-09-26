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
    const [phone, setPhone] = useState('');
    const [product, setProduct] = useState('');
    const [purchaseDate, setPurchaseDate] = useState('');
    const [cardFile, setCardFile] = useState<File | null>(null);
    const [honeypot, setHoneypot] = useState(''); // Anti-spam: campo oculto, humanos no lo llenan.
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    // Sube la foto de la tarjeta al bucket público `warranty-cards` y devuelve la URL (o null).
    const uploadCard = async (): Promise<string | null> => {
        if (!cardFile) return null;
        const ext = (cardFile.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('warranty-cards').upload(path, cardFile, { cacheControl: '3600', upsert: false });
        if (upErr) { console.error('[warranty-card] upload:', upErr.message); return null; }
        return supabase.storage.from('warranty-cards').getPublicUrl(path).data.publicUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        // Bot detectado: finge éxito, no inserta nada.
        if (honeypot.trim() !== '') { setDone(true); setTimeout(() => router.push('/'), 4000); return; }
        if (phone.replace(/\D/g, '').length < 9) { setError('Ingresa un celular válido (9 dígitos).'); return; }
        if (cardFile && cardFile.size > 5 * 1024 * 1024) { setError('La foto no debe superar 5 MB.'); return; }
        setLoading(true);

        const cardUrl = await uploadCard();
        const { error: err } = await supabase.from('warranties').insert({
            customer_name: name.trim(),
            customer_phone: phone.trim(),
            product: product.trim() !== '' ? product.trim() : null,
            purchase_date: purchaseDate !== '' ? purchaseDate : null,
            card_image_url: cardUrl,
        });
        setLoading(false);
        if (err) {
            // 23505 = violación de índice único: garantía ya registrada.
            if (err.code === '23505') { setError('Ya existe una garantía registrada con este celular para ese producto.'); return; }
            setError('No se pudo registrar. Intenta de nuevo.');
            return;
        }
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
                            {/* Honeypot anti-spam: oculto para humanos, los bots lo llenan. */}
                            <input
                                type="text"
                                name="website"
                                tabIndex={-1}
                                autoComplete="off"
                                value={honeypot}
                                onChange={(e) => setHoneypot(e.target.value)}
                                className="hidden"
                                aria-hidden="true"
                            />
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Nombre completo *</label>
                                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-[#0b0b12] border border-[#242430] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#22d3ee]" placeholder="Ej. Juan Pérez García" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Celular / WhatsApp *</label>
                                <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-[#0b0b12] border border-[#242430] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#22d3ee]" placeholder="Ej. 987654321" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Fecha de compra *</label>
                                <input
                                    required
                                    type="date"
                                    lang="es-PE"
                                    value={purchaseDate}
                                    onChange={(e) => setPurchaseDate(e.target.value)}
                                    onClick={(e) => { try { (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.(); } catch { /* navegador sin showPicker */ } }}
                                    max={new Date().toISOString().slice(0, 10)}
                                    className="w-full bg-[#0b0b12] border border-[#242430] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#22d3ee] [color-scheme:dark]"
                                />
                                <p className="text-[10px] text-slate-500 mt-1">Escribe la fecha (dd/mm/aaaa) o tócala para abrir el calendario 📅</p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1 flex justify-between"><span>Producto</span><span className="text-slate-500 text-[10px]">(opcional)</span></label>
                                <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} className="w-full bg-[#0b0b12] border border-[#242430] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#22d3ee]" placeholder="Ej. PS5 Slim / God of War" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1 flex justify-between"><span>Foto de tu tarjeta de garantía</span><span className="text-slate-500 text-[10px]">(opcional)</span></label>
                                <input type="file" accept="image/*" onChange={(e) => setCardFile(e.target.files?.[0] ?? null)} className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#242430] file:text-white hover:file:bg-[#2f2f3d]" />
                                <p className="text-[10px] text-slate-500 mt-1">Sube una foto de la tarjeta donde se vea la fecha. Ayuda a validar tu garantía.</p>
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
