'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// Formulario del footer para captar correos (con consentimiento explícito).
export default function NewsletterSignup() {
    const [email, setEmail] = useState('');
    const [agree, setAgree] = useState(false);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMsg(null);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setMsg({ ok: false, text: 'Ingresa un correo válido.' });
            return;
        }
        if (!agree) {
            setMsg({ ok: false, text: 'Marca la casilla para aceptar recibir novedades.' });
            return;
        }
        setLoading(true);
        const { error } = await supabase.from('subscribers').insert({
            email: email.trim().toLowerCase(),
            source: 'footer',
            consent: true,
        });
        setLoading(false);
        if (error) {
            // 23505 = correo ya registrado.
            if (error.code === '23505') { setMsg({ ok: true, text: '¡Ya estás suscrito! Gracias.' }); setEmail(''); return; }
            setMsg({ ok: false, text: 'No se pudo suscribir. Intenta de nuevo.' });
            return;
        }
        setMsg({ ok: true, text: '¡Listo! Te avisaremos de ofertas y novedades.' });
        setEmail('');
        setAgree(false);
    };

    return (
        <div className="mt-8 rounded-2xl border border-[#242430] bg-[#0d0d14] p-5">
            <p className="text-sm font-black text-white">📩 Recibe ofertas y novedades</p>
            <p className="text-xs text-[#8891a8] mt-1">Enterate primero de nuevos ingresos, descuentos y preventas.</p>
            <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
                <div className="flex flex-col sm:flex-row gap-2">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tucorreo@ejemplo.com"
                        className="flex-1 bg-[#12121a] border border-[#242430] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#22d3ee]"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-5 py-2.5 rounded-xl text-sm font-black bg-[#fcd34d] text-zinc-950 hover:bg-[#fbbf24] transition disabled:opacity-50 whitespace-nowrap"
                    >
                        {loading ? 'Enviando…' : 'Suscribirme'}
                    </button>
                </div>
                <label className="flex items-start gap-2 text-[11px] text-[#8891a8]">
                    <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-[#fcd34d]" />
                    <span>Acepto recibir correos con novedades y ofertas de SCOTT GAMES. Puedo darme de baja cuando quiera. Ver <Link href="/privacidad" className="text-[#22d3ee] hover:underline">Privacidad</Link>.</span>
                </label>
                {msg && <p className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</p>}
            </form>
        </div>
    );
}
