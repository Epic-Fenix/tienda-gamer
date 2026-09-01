interface Props {
    // Clases extra para el contenedor (alineación/márgenes).
    className?: string;
}

// Logo oficial de SCOTT GAMES: imagen real desde /public/logo-scott.png.
export default function LogoScott({ className = '' }: Props) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src="/logo-scott.png"
            alt="Scott Games"
            width={180}
            height={50}
            className={`h-10 w-auto object-contain ${className}`}
        />
    );
}
