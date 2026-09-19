interface Props {
    // Clases extra para el contenedor (alineación/márgenes).
    className?: string;
}

// Logo horizontal de SCOTT GAMES: isotipo (imagen real, fondo negro eliminado
// con mix-blend screen) + wordmark "SCOTT GAMES" con degradado neón cyan→magenta.
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
            <span className="leading-none whitespace-nowrap font-gamer text-arcade">
                <span className="font-black text-xl tracking-wider">SCOTT</span>
                <span className="font-black text-xl tracking-wider ml-1">GAMES</span>
            </span>
        </span>
    );
}
