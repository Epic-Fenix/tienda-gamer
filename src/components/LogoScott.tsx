'use client';

import { useState } from 'react';

interface Props {
    className?: string;
    // Muestra el texto "SCOTT GAMES" junto al isotipo en el fallback.
    withText?: boolean;
}

// Logo oficial de SCOTT GAMES. Usa /public/logo-scott.png; si no existe,
// cae a un isotipo vectorial (hexágono con mando) + wordmark.
export default function LogoScott({ className = 'h-9 w-auto', withText = true }: Props) {
    const [err, setErr] = useState(false);

    if (!err) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src="/logo-scott.png" alt="SCOTT GAMES" onError={() => setErr(true)} className={className} />;
    }

    // Fallback vectorial
    return (
        <span className="inline-flex items-center gap-2">
            <span className="relative inline-flex" style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.7))' }}>
                <svg viewBox="0 0 48 48" className="w-9 h-9" aria-hidden="true">
                    <defs>
                        <linearGradient id="logoScottFallback" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stopColor="#8b5cf6" />
                            <stop offset="1" stopColor="#2dd4bf" />
                        </linearGradient>
                    </defs>
                    <path d="M24 3l16 5v12c0 10-6.8 17.6-16 21-9.2-3.4-16-11-16-21V8l16-5z" fill="#1e0d3b" stroke="url(#logoScottFallback)" strokeWidth="2.5" strokeLinejoin="round" />
                    <g fill="#fcd34d">
                        <rect x="13" y="21" width="22" height="10" rx="5" />
                        <circle cx="16.5" cy="26" r="1.6" fill="#1e0d3b" />
                        <rect x="20.2" y="25.2" width="1.6" height="1.6" fill="#1e0d3b" />
                        <circle cx="31.5" cy="26" r="1.4" fill="#1e0d3b" />
                    </g>
                </svg>
            </span>
            {withText && <span className="text-2xl font-black tracking-wider text-white">SCOTT <span className="text-[#fcd34d]">GAMES</span></span>}
        </span>
    );
}
