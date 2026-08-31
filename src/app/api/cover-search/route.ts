import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface CoverResult {
    title: string;
    cover_url: string;
    release_year: string | null;
    platform: string;
}

// --- Fuente 1 (sin API key): Steam Store. Devuelve pósters verticales library_600x900 (2:3). ---
async function searchSteam(query: string): Promise<CoverResult[]> {
    try {
        const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=en&cc=us`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) return [];
        const data = await res.json();
        const items: Array<{ id: number; name: string }> = Array.isArray(data?.items) ? data.items.slice(0, 6) : [];

        return await Promise.all(
            items.map(async (it) => {
                const cover_url = `https://cdn.cloudflare.steamstatic.com/steam/apps/${it.id}/library_600x900.jpg`;
                let release_year: string | null = null;
                try {
                    const d = await fetch(`https://store.steampowered.com/api/appdetails?appids=${it.id}&filters=release_date`);
                    if (d.ok) {
                        const dd = await d.json();
                        const date: string | undefined = dd?.[it.id]?.data?.release_date?.date;
                        const m = date ? String(date).match(/\d{4}/) : null;
                        if (m) release_year = m[0];
                    }
                } catch {
                    // año best-effort
                }
                return { title: it.name, cover_url, release_year, platform: 'PC / Steam' };
            })
        );
    } catch {
        return [];
    }
}

// --- Fuente 2 (opcional, requiere RAWG_API_KEY): metadatos y arte de RAWG. ---
async function searchRawg(query: string): Promise<CoverResult[]> {
    const key = process.env.RAWG_API_KEY;
    if (!key) return [];
    try {
        const url = `https://api.rawg.io/api/games?key=${key}&search=${encodeURIComponent(query)}&page_size=6`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        const games: Array<{ name: string; background_image?: string; released?: string; platforms?: Array<{ platform?: { name?: string } }> }> =
            data?.results || [];
        return games
            .filter((g) => g.background_image)
            .map((g) => ({
                title: g.name,
                cover_url: g.background_image as string,
                release_year: g.released ? String(g.released).slice(0, 4) : null,
                platform: (g.platforms || []).map((p) => p.platform?.name).filter(Boolean).slice(0, 2).join(', ') || 'Varios',
            }));
    } catch {
        return [];
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('query') || '').trim();
    if (query === '') return NextResponse.json({ results: [] });

    // Prioriza pósters verticales de Steam; si no hay resultados, usa RAWG (si hay API key).
    let results = await searchSteam(query);
    if (results.length === 0) results = await searchRawg(query);

    return NextResponse.json({ results });
}
