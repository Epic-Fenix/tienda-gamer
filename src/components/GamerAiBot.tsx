'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { Product } from '@/types/database';

interface BotProduct {
    id: string;
    name: string;
    price: number;
    stock: number;
    condition: string;
    image_url: string | null;
    min_reservation_pct: number;
    category: string;
    platform: string | null;
}

interface Msg {
    role: 'user' | 'assistant';
    content: string;
    products?: BotProduct[];
}

const SUGGESTIONS = ['¿Tienen PS5?', '¿Cómo funciona el trueque?', '¿Tienen envío gratis?', '¿Dónde están ubicados?'];

const WELCOME: Msg = {
    role: 'assistant',
    content: '¡Hola! 👋 Soy el Asistente SCOTT. Pregúntame por precios, disponibilidad, envío gratis, trueque o cómo llegar a la tienda. ¿En qué te ayudo?',
};

export default function GamerAiBot() {
    const pathname = usePathname();
    const { addItem } = useCart();
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Msg[]>([WELCOME]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, loading, open]);

    // No mostrar el bot en el panel de administración.
    if (pathname?.startsWith('/admin')) return null;

    const send = async (text: string) => {
        const content = text.trim();
        if (content === '' || loading) return;
        const history = [...messages, { role: 'user', content } as Msg];
        setMessages(history);
        setInput('');
        setLoading(true);
        try {
            const res = await fetch('/api/chat-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: history.filter((m) => m.role === 'user' || m.role === 'assistant').map((m) => ({ role: m.role, content: m.content })),
                }),
            });
            const data = await res.json();
            setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'No pude procesar tu consulta ahora.', products: data.products || [] }]);
        } catch {
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Tuvimos un problema de conexión. Inténtalo de nuevo en un momento.' }]);
        }
        setLoading(false);
    };

    return (
        <>
            {/* Botón flotante (a la izquierda del carrito) */}
            <button
                onClick={() => setOpen((v) => !v)}
                aria-label="Asistente Gamer"
                className="fixed bottom-6 right-24 z-40 flex items-center gap-2 h-14 pl-3 pr-4 rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white shadow-2xl shadow-fuchsia-900/40 transition"
            >
                <span className="text-xl">🤖</span>
                <span className="hidden sm:block text-xs font-black leading-tight text-left">Asistente<br />SCOTT</span>
            </button>

            {open && (
                <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm h-[30rem] max-h-[72vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-fuchsia-600 to-indigo-600">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🤖</span>
                            <div>
                                <p className="text-sm font-black text-white leading-none">Asistente SCOTT</p>
                                <p className="text-[10px] text-white/80 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> En línea</p>
                            </div>
                        </div>
                        <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-2xl leading-none" aria-label="Cerrar">×</button>
                    </div>

                    {/* Mensajes */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-950">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs whitespace-pre-line ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-100 rounded-bl-sm'}`}>
                                    {m.content}
                                    {m.products && m.products.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                            {m.products.map((p) => (
                                                <div key={p.id} className="bg-slate-950 border border-slate-700 rounded-lg p-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-9 h-12 rounded overflow-hidden bg-slate-900 shrink-0">
                                                            {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-[7px] text-slate-600 flex items-center justify-center h-full">Sin foto</span>}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-bold text-white truncate">{p.name}</p>
                                                            <p className="text-[10px] text-slate-400">S/. {Number(p.price).toFixed(2)} · {p.condition === 'segunda_mano' ? 'Seminuevo' : 'Nuevo'} · {p.stock > 0 ? `${p.stock} en stock` : 'Agotado'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1.5 mt-2">
                                                        <a href="/" className="flex-1 text-center py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold transition">Ver en tienda</a>
                                                        {p.stock > 0 && (
                                                            <button
                                                                onClick={() => addItem(p as unknown as Product)}
                                                                className="flex-1 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold transition"
                                                            >
                                                                Agregar al carrito
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-bl-sm px-3 py-2 text-xs">escribiendo…</div>
                            </div>
                        )}
                    </div>

                    {/* Sugerencias rápidas */}
                    {messages.length <= 1 && (
                        <div className="px-3 pb-2 flex flex-wrap gap-1.5 bg-slate-950">
                            {SUGGESTIONS.map((s) => (
                                <button key={s} onClick={() => send(s)} className="text-[10px] px-2 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition">
                                    {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 p-3 border-t border-slate-800 bg-slate-900">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Escribe tu pregunta..."
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-full px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                        />
                        <button type="submit" disabled={loading || input.trim() === ''} className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition disabled:opacity-40" aria-label="Enviar">
                            ➤
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
