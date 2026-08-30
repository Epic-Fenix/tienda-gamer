'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const FALLBACK_PRODUCTS = [
    'Consola PlayStation 5',
    'Xbox Series X',
    'Nintendo Switch OLED',
    'EA Sports FC 25',
    'The Legend of Zelda',
];

const ACTIONS = ['acaba de reservar', 'agregó al carrito', 'está viendo', 'separó'];
const CITIES = ['Lima', 'Arequipa', 'Trujillo', 'Chiclayo', 'Piura', 'Cusco', 'Huancayo'];

export default function SocialProofToasts() {
    const [message, setMessage] = useState<string | null>(null);
    const productsRef = useRef<string[]>(FALLBACK_PRODUCTS);

    // Carga nombres reales de productos para dar realismo.
    useEffect(() => {
        let active = true;
        supabase
            .from('products')
            .select('name')
            .limit(30)
            .then(({ data }) => {
                if (active && data && data.length > 0) {
                    productsRef.current = data.map((p: { name: string }) => p.name);
                }
            });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let hideTimer: ReturnType<typeof setTimeout>;

        const showOne = () => {
            const pool = productsRef.current;
            const product = pool[Math.floor(Math.random() * pool.length)];
            const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
            const city = CITIES[Math.floor(Math.random() * CITIES.length)];
            const minutes = Math.floor(Math.random() * 22) + 2;
            setMessage(`Alguien de ${city} ${action} ${product} hace ${minutes} minutos`);
            hideTimer = setTimeout(() => setMessage(null), 6000);
        };

        // Primer toast a los ~8s, luego cada 20-30s.
        const firstTimer = setTimeout(showOne, 8000);
        const interval = setInterval(showOne, 20000 + Math.floor(Math.random() * 10000));

        return () => {
            clearTimeout(firstTimer);
            clearTimeout(hideTimer);
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="fixed bottom-6 left-6 z-30 pointer-events-none">
            <div
                className={`max-w-xs bg-slate-900 border border-slate-700 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 transition-all duration-500 ${
                    message ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
            >
                <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-sm shrink-0">🔥</div>
                <div>
                    <p className="text-xs text-slate-200 leading-snug">{message}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Actividad reciente en la tienda</p>
                </div>
            </div>
        </div>
    );
}
