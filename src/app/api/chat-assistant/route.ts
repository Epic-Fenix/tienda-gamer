import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types/database';
import { STORE } from '@/lib/site';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FREE_SHIPPING_THRESHOLD = 300;

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

const conditionLabel = (c: string) => (c === 'segunda_mano' ? 'Seminuevo' : 'Nuevo');

// Coincidencia simple por tokens del catálogo.
function matchProducts(query: string, products: Product[]): Product[] {
    const tokens = query.toLowerCase().split(/[^a-z0-9áéíóúñ]+/i).filter((t) => t.length >= 3);
    if (tokens.length === 0) return [];
    const scored = products
        .map((p) => {
            const hay = `${p.name} ${p.category} ${p.platform ?? ''}`.toLowerCase();
            const score = tokens.reduce((s, t) => (hay.includes(t) ? s + 1 : s), 0);
            return { p, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map((x) => x.p);
}

// Respuesta determinística (sin API key de IA).
function deterministicReply(message: string, products: Product[], matched: Product[]): string {
    const q = message.toLowerCase();

    if (/(env[ií]o|delivery|gratis)/.test(q)) {
        return `🚚 ¡Sí! Tienes envío gratis en compras mayores a S/. ${FREE_SHIPPING_THRESHOLD}. Si tu carrito está por debajo, te mostramos cuánto te falta para alcanzarlo.`;
    }
    if (/(trueque|cambio|usado|trade|intercambi|permut)/.test(q)) {
        return `🔁 Con nuestro sistema de trueque puedes traer tu consola o juego usado y pagar solo la diferencia por lo que quieras llevarte. Usa el botón "Trae tu usado" y te contactamos por WhatsApp con una propuesta.`;
    }
    if (/(ubicaci|direcci|d[óo]nde|local|tienda f[íi]sica|llegar|queda|mapa)/.test(q)) {
        return `📍 Nos ubicamos en ${STORE.address}. ¡Te esperamos!`;
    }
    if (/(hola|buenas|hey|qué tal|que tal|saludos)/.test(q) && matched.length === 0) {
        return `¡Hola! 👋 Soy el asistente de ${STORE.name}. Puedo ayudarte con disponibilidad y precios, si un producto es nuevo o seminuevo, el envío gratis (desde S/. ${FREE_SHIPPING_THRESHOLD}), el trueque y nuestra ubicación. ¿Qué buscas hoy?`;
    }

    if (matched.length > 0) {
        const lines = matched
            .map((p) => {
                const estado = p.stock > 0 ? `${p.stock} en stock` : 'agotado';
                return `• ${p.name} — S/. ${Number(p.price).toFixed(2)} (${conditionLabel(p.condition)}, ${estado})`;
            })
            .join('\n');
        return `Esto es lo que tengo relacionado:\n${lines}\n\n¿Te reservo alguno? Recuerda: envío gratis desde S/. ${FREE_SHIPPING_THRESHOLD}. 🎮`;
    }

    return `No encontré ese título en el catálogo ahora mismo. Puedes anotarte con "Encargar" para avisarte cuando llegue, o dejarnos tu usado en trueque. También tenemos ${products.length} productos disponibles. ¿Te ayudo a buscar por consola (PS5, Xbox, Switch)?`;
}

function buildCatalogContext(products: Product[]): string {
    const lines = products.slice(0, 60).map((p) => {
        const estado = p.stock > 0 ? `stock ${p.stock}` : 'agotado';
        return `- ${p.name} | ${p.platform || p.category} | S/. ${Number(p.price).toFixed(2)} | ${conditionLabel(p.condition)} | ${estado}`;
    });
    return lines.join('\n');
}

// Genera respuesta con Gemini si hay GEMINI_API_KEY.
async function geminiReply(messages: ChatMessage[], products: Product[]): Promise<string | null> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return null;
    try {
        const system =
            `Eres el asistente virtual de ${STORE.name}, una tienda gamer en Perú. Responde en español, tono gamer, ` +
            `amable y profesional, en 1-3 frases máximo. Usa SOLO la información del catálogo; no inventes productos ni precios. ` +
            `Datos clave: envío gratis en compras mayores a S/. ${FREE_SHIPPING_THRESHOLD}; hay trueque (traer usado y pagar la diferencia); ` +
            `ubicación física: ${STORE.address}. Indica si un producto es Nuevo o Seminuevo y su stock cuando aplique.\n\n` +
            `CATÁLOGO ACTUAL:\n${buildCatalogContext(products)}`;

        const contents = messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
        }));

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: system }] },
                    contents,
                    generationConfig: { temperature: 0.5, maxOutputTokens: 300 },
                }),
            }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return text ? text.trim() : null;
    } catch {
        return null;
    }
}

// Genera respuesta con OpenAI si hay OPENAI_API_KEY.
async function openaiReply(messages: ChatMessage[], products: Product[]): Promise<string | null> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    try {
        const system =
            `Eres el asistente virtual de ${STORE.name}, tienda gamer en Perú. Responde en español, tono gamer y profesional, ` +
            `en 1-3 frases. Usa SOLO el catálogo; no inventes. Envío gratis desde S/. ${FREE_SHIPPING_THRESHOLD}; hay trueque; ` +
            `ubicación: ${STORE.address}.\n\nCATÁLOGO:\n${buildCatalogContext(products)}`;
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                temperature: 0.5,
                max_tokens: 300,
                messages: [{ role: 'system', content: system }, ...messages.map((m) => ({ role: m.role, content: m.content }))],
            }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const text: string | undefined = data?.choices?.[0]?.message?.content;
        return text ? text.trim() : null;
    } catch {
        return null;
    }
}

export async function POST(request: Request) {
    let body: { message?: string; messages?: ChatMessage[] } = {};
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ reply: 'No entendí tu mensaje, ¿puedes repetirlo?', products: [] }, { status: 200 });
    }

    // Normaliza a un historial breve (últimos 6 turnos).
    let messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
    if (body.message) messages = [...messages, { role: 'user', content: body.message }];
    messages = messages.filter((m) => m && typeof m.content === 'string' && m.content.trim() !== '').slice(-6);

    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

    // Catálogo (RLS: SELECT público de products).
    const { data } = await supabase.from('products').select('*').order('name', { ascending: true });
    const products = (data as Product[]) || [];
    const matched = matchProducts(lastUser, products);

    // IA con fallback determinístico.
    const aiReply = (await geminiReply(messages, products)) || (await openaiReply(messages, products));
    const reply = aiReply || deterministicReply(lastUser, products, matched);

    // Productos recomendados (para botones "Ver en tienda" / "Agregar al carrito").
    const recommended = matched.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: p.stock,
        condition: p.condition,
        image_url: p.image_url ?? null,
        min_reservation_pct: p.min_reservation_pct,
        category: p.category,
        platform: p.platform ?? null,
    }));

    return NextResponse.json({ reply, products: recommended });
}
