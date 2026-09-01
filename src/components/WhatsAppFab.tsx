'use client';

import { useState } from 'react';
import { CONTACT } from '@/lib/site';

// Botón flotante de WhatsApp (esquina inferior izquierda) con badge "En línea"
// y tooltip "Chatea con nosotros". Enlaza al WhatsApp de ventas.
export default function WhatsAppFab() {
    const [hover, setHover] = useState(false);

    return (
        <a
            href={CONTACT.whatsappSalesLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chatea con nosotros por WhatsApp"
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className="fixed bottom-6 left-6 z-40 flex items-center"
        >
            {/* Botón circular */}
            <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#25d366] hover:bg-[#1ebe5b] shadow-2xl shadow-emerald-900/50 transition-transform hover:scale-105">
                {/* Pulso "en línea" */}
                <span className="absolute inset-0 rounded-full bg-[#25d366] opacity-60 animate-ping" />
                <svg viewBox="0 0 24 24" fill="#ffffff" className="relative w-7 h-7" aria-hidden="true">
                    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.599 5.35l-.999 3.648 3.9-.297zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                {/* Badge "En línea" */}
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-slate-950 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                </span>
            </span>

            {/* Tooltip */}
            <span
                className={`ml-3 whitespace-nowrap rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 shadow-xl transition-all duration-200 ${hover ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'}`}
            >
                <span className="block text-xs font-bold text-white">Chatea con nosotros</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> En línea
                </span>
            </span>
        </a>
    );
}
