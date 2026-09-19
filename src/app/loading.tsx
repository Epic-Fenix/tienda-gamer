export default function Loading() {
    return (
        <main className="min-h-screen bg-[#08080c] text-slate-100 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#22d3ee] border-t-transparent animate-spin" />
            <p className="font-gamer text-sm text-slate-400">Cargando…</p>
        </main>
    );
}
