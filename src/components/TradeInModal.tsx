'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PAYMENT_INFO } from '@/lib/payment';

interface Props {
    onClose: () => void;
}

const PLATFORMS = ['PS5', 'PS4', 'Nintendo Switch', 'Xbox', 'Consola completa', 'Accesorio / Otro'];

// Arma el mensaje de cotización de trueque para WhatsApp.
function buildTruequeWhatsappLink(params: { name: string; phone: string; platform: string; title: string; wanted: string }) {
    const { name, phone, platform, title, wanted } = params;
    const msg =
        `🔄 *COTIZACIÓN DE TRUEQUE - SCOTT GAMES*\n` +
        `----------------------------------\n` +
        `Cliente: ${name || '—'} | Celular: ${phone || '—'}\n` +
        `Entrego: ${platform}${title ? ` - ${title}` : ''}\n` +
        `Me interesa llevar: ${wanted || '(por definir)'}\n` +
        `----------------------------------\n` +
        `¿Cuánto sería la diferencia a pagar? ¡Gracias!`;
    return `https://wa.me/${PAYMENT_INFO.whatsappDigits}?text=${encodeURIComponent(msg)}`;
}

export default function TradeInModal({ onClose }: Props) {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [platform, setPlatform] = useState(PLATFORMS[0]);
    const [title, setTitle] = useState('');
    const [wanted, setWanted] = useState('');

    const canSend = name.trim() !== '' && phone.trim() !== '' && title.trim() !== '';
    const waLink = buildTruequeWhatsappLink({ name, phone, platform, title, wanted });

    // Registra la solicitud en Supabase (no bloquea la apertura de WhatsApp).
    const registerTradeIn = () => {
        if (!canSend) return;
        void supabase.from('trade_ins').insert({
            customer_name: name,
            customer_phone: phone,
            offered_item: `${platform} - ${title}`,
            wanted_item: wanted.trim() !== '' ? wanted.trim() : null,
            status: 'pending',
        }).then(({ error }) => {
            if (error) console.error('[trade_ins] insert error:', error.message);
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between mb-1">
                    <h2 className="text-lg font-bold text-white">🔄 Cotizar Trueque / Plan Canje</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none" aria-label="Cerrar">×</button>
                </div>
                <p className="text-xs text-slate-400 mb-4">Trae tu juego o consola, cuéntanos qué quieres llevar y te cotizamos la diferencia por WhatsApp.</p>

                <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-slate-400 block mb-1">Nombre *</label>
                            <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. Juan Pérez" />
                        </div>
                        <div>
                            <label className="text-slate-400 block mb-1">WhatsApp / Celular *</label>
                            <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. 987654321" />
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">Lo que entregas</p>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-slate-400 block mb-1">Plataforma *</label>
                                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500">
                                    {PLATFORMS.map((pl) => <option key={pl} value={pl}>{pl}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-slate-400 block mb-1">Título / Modelo *</label>
                                <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. FIFA 24 / PS4 Slim 1TB" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-slate-400 block mb-1">Producto de la tienda que te interesa llevar</label>
                        <input type="text" value={wanted} onChange={(e) => setWanted(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500" placeholder="Ej. PS5 Slim / EA Sports FC 25" />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose} className="w-2/5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition">Cancelar</button>
                        <a
                            href={canSend ? waLink : undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                                if (!canSend) { e.preventDefault(); return; }
                                registerTradeIn();
                            }}
                            aria-disabled={!canSend}
                            className={`w-3/5 py-2.5 rounded-lg font-black text-center transition flex items-center justify-center gap-2 ${canSend ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.599 5.35l-.999 3.648 3.9-.297zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                            Enviar cotización a WhatsApp
                        </a>
                    </div>
                    <p className="text-[10px] text-slate-500 text-center">* Completa nombre, celular y el título de lo que entregas para habilitar el envío.</p>
                </div>
            </div>
        </div>
    );
}
