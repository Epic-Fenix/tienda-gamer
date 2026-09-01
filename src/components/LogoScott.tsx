interface Props {
    // Clases extra para el contenedor (alineación/márgenes). El tamaño es fijo.
    className?: string;
}

// Logo horizontal de SCOTT GAMES: isotipo hexagonal (SVG transparente, sin caja
// de fondo) + wordmark "SCOTT" (blanco) / "GAMES" (amarillo neón).
export default function LogoScott({ className = '' }: Props) {
    return (
        <span className={`flex items-center gap-3 ${className}`}>
            {/* Isotipo hexagonal — fondo transparente para eliminar cualquier caja negra */}
            <svg
                viewBox="0 0 48 48"
                className="h-10 w-10 shrink-0"
                aria-hidden="true"
                style={{ mixBlendMode: 'screen', filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.6))' }}
            >
                <defs>
                    <linearGradient id="logoScottHex" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#8b5cf6" />
                        <stop offset="1" stopColor="#2dd4bf" />
                    </linearGradient>
                </defs>
                <path
                    d="M24 3l16 5v12c0 10-6.8 17.6-16 21-9.2-3.4-16-11-16-21V8l16-5z"
                    fill="none"
                    stroke="url(#logoScottHex)"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                />
                <g fill="#facc15">
                    <rect x="13" y="21" width="22" height="10" rx="5" />
                    <circle cx="16.5" cy="26" r="1.6" fill="#0c0414" />
                    <rect x="20.2" y="25.2" width="1.6" height="1.6" fill="#0c0414" />
                    <circle cx="31.5" cy="26" r="1.4" fill="#0c0414" />
                </g>
            </svg>
            {/* Wordmark */}
            <span className="leading-none whitespace-nowrap">
                <span className="font-black text-white text-xl tracking-wider">SCOTT </span>
                <span className="font-black text-[#facc15] text-xl tracking-wider">GAMES</span>
            </span>
        </span>
    );
}
