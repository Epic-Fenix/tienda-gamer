interface Props {
    // Clases extra para el contenedor (alineación/márgenes).
    className?: string;
}

// Logo horizontal de SCOTT GAMES: isotipo (imagen real, fondo negro eliminado
// con mix-blend screen) + wordmark "SCOTT" blanco / "GAMES" amarillo neón.
export default function LogoScott({ className = '' }: Props) {
    return (
        <span className={`flex items-center gap-2.5 ${className}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/logo-scott.png"
                alt="Scott Games"
                className="h-10 w-10 object-contain rounded-lg"
                style={{ mixBlendMode: 'screen' }}
            />
            <span className="leading-none whitespace-nowrap">
                <span className="font-black text-xl tracking-wider text-white">SCOTT</span>
                <span className="font-black text-xl tracking-wider text-[#facc15] ml-1">GAMES</span>
            </span>
        </span>
    );
}
