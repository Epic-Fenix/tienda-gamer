'use client';

import { useState } from 'react';

interface CoverResult {
    title: string;
    cover_url: string;
    release_year: string | null;
    platform: string;
}

interface Props {
    query: string;
    onSelect: (url: string) => void;
}

export default function CoverSearch({ query, onSelect }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [results, setResults] = useState<CoverResult[]>([]);

    const search = async () => {
        const q = query.trim();
        if (q === '') {
            alert('Escribe primero el nombre del producto para buscar su carátula.');
            return;
        }
        setOpen(true);
        setLoading(true);
        setSearched(true);
        try {
            const res = await fetch(`/api/cover-search?query=${encodeURIComponent(q)}`);
            const data = await res.json();
            setResults(Array.isArray(data.results) ? data.results.slice(0, 6) : []);
        } catch {
            setResults([]);
        }
        setLoading(false);
    };

    return (
        <div className="mt-2">
            <button
                type="button"
                onClick={search}
                className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-fuchsia-600/20 hover:bg-fuchsia-600 text-fuchsia-300 hover:text-white border border-fuchsia-500/30 transition"
            >
                🔍 Buscar Carátula HD
            </button>

            {open && (
                <div className="mt-2 bg-slate-950 border border-slate-800 rounded-lg p-2">
                    {loading ? (
                        <p className="text-[11px] text-slate-400 py-3 text-center">Buscando carátulas…</p>
                    ) : results.length === 0 ? (
                        <p className="text-[11px] text-slate-500 py-3 text-center">
                            {searched ? 'Sin resultados. Prueba con otro nombre o pega una URL manual.' : ''}
                        </p>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {results.map((r, i) => (
                                <button
                                    key={`${r.cover_url}-${i}`}
                                    type="button"
                                    onClick={() => { onSelect(r.cover_url); setOpen(false); }}
                                    title={`${r.title}${r.release_year ? ` (${r.release_year})` : ''} · ${r.platform}`}
                                    className="group relative rounded-md overflow-hidden border border-slate-800 hover:border-fuchsia-500 transition"
                                >
                                    <div className="aspect-[3/4] bg-slate-900">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={r.cover_url}
                                            alt={r.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.currentTarget.parentElement as HTMLElement).innerHTML = '<span class="text-[8px] text-slate-600 flex items-center justify-center h-full p-1 text-center">Sin carátula</span>'; }}
                                        />
                                    </div>
                                    {r.release_year && (
                                        <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] py-0.5 text-center">{r.release_year}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                    <button type="button" onClick={() => setOpen(false)} className="mt-2 text-[10px] text-slate-500 hover:text-white">Cerrar búsqueda</button>
                </div>
            )}
        </div>
    );
}
