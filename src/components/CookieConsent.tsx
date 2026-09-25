'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getConsent, setConsent } from '@/lib/consent';

// Banner de consentimiento de cookies. Aparece solo si el usuario aún no decidió.
export default function CookieConsent() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (getConsent() === null) setVisible(true);
    }, []);

    const decide = (value: 'accepted' | 'rejected') => {
        setConsent(value);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
            <div className="mx-auto max-w-3xl bg-[#12121a] border border-[#2a2a38] rounded-2xl shadow-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 text-xs sm:text-sm text-slate-300">
                    <p className="font-bold text-white mb-1">🍪 Usamos cookies</p>
                    <p className="text-slate-400">
                        Usamos cookies propias y de terceros para analizar el uso del sitio y mejorar tu experiencia.
                        Puedes aceptar o rechazar la analítica. Lee más en nuestra{' '}
                        <Link href="/privacidad" className="text-[#22d3ee] hover:underline">Política de Privacidad</Link>.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={() => decide('rejected')}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                    >
                        Rechazar
                    </button>
                    <button
                        onClick={() => decide('accepted')}
                        className="px-4 py-2 rounded-xl text-xs font-black bg-[#fcd34d] text-zinc-950 hover:bg-[#fbbf24] transition"
                    >
                        Aceptar
                    </button>
                </div>
            </div>
        </div>
    );
}
