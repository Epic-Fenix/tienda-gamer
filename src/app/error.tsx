'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <main className="min-h-screen bg-[#08080c] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
            <p className="font-gamer text-5xl font-black text-rose-400" style={{ textShadow: '0 0 12px rgba(244,63,94,0.5)' }}>⚠</p>
            <h1 className="font-gamer text-xl font-black mt-3">Algo salió mal</h1>
            <p className="text-sm text-slate-400 mt-2 max-w-sm">Ocurrió un error al cargar. Reintenta en un momento.</p>
            <button onClick={reset} className="mt-6 px-6 py-3 rounded-xl text-sm font-black bg-[#22d3ee] text-zinc-950 hover:bg-[#0891b2] transition">Reintentar</button>
        </main>
    );
}
