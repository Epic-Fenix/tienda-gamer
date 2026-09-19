import Link from 'next/link';

export default function NotFound() {
    return (
        <main className="min-h-screen bg-[#08080c] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
            <p className="font-gamer text-6xl font-black text-[#22d3ee]" style={{ textShadow: '0 0 12px rgba(34,211,238,0.5)' }}>404</p>
            <h1 className="font-gamer text-xl font-black mt-3">Game Over — página no encontrada</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-sm">La página que buscas no existe o se movió.</p>
            <Link href="/" className="mt-6 px-6 py-3 rounded-xl text-sm font-black bg-[#fcd34d] text-zinc-950 hover:bg-[#fbbf24] transition">Volver al catálogo</Link>
        </main>
    );
}
