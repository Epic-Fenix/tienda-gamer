'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Order, Warranty, Subscriber } from '@/types/database';
import { normalizePhone } from '@/lib/site';
import { normalizeStatus } from '@/lib/orderStatus';
import { formatSoles } from '@/lib/payment';

interface Client {
    key: string;          // teléfono normalizado (identidad)
    name: string;
    phone: string;
    email: string;
    orders: number;
    spent: number;        // facturado en pedidos entregados
    warranties: number;
    subscribed: boolean;  // correo en la lista de marketing
    lastActivity: string; // ISO
    fromOrders: boolean;
    fromWarranty: boolean;
}

export default function ClientsManager() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [warranties, setWarranties] = useState<Warranty[]>([]);
    const [subs, setSubs] = useState<Subscriber[]>([]);
    const [query, setQuery] = useState('');

    const fetchAll = async () => {
        const [{ data: ord }, { data: war }, { data: sub }] = await Promise.all([
            supabase.from('orders').select('*').order('created_at', { ascending: false }),
            supabase.from('warranties').select('*').order('created_at', { ascending: false }),
            supabase.from('subscribers').select('email'),
        ]);
        if (ord) setOrders(ord as Order[]);
        if (war) setWarranties(war as Warranty[]);
        if (sub) setSubs(sub as Subscriber[]);
    };

    useEffect(() => { fetchAll(); }, []);

    const clients = useMemo(() => {
        const subSet = new Set(subs.map((s) => (s.email || '').toLowerCase()));
        const map = new Map<string, Client>();
        const touch = (phone: string, name: string, when: string): Client => {
            const key = normalizePhone(phone) || phone;
            let c = map.get(key);
            if (!c) {
                c = { key, name, phone, email: '', orders: 0, spent: 0, warranties: 0, subscribed: false, lastActivity: when, fromOrders: false, fromWarranty: false };
                map.set(key, c);
            }
            if (name && name.length > c.name.length) c.name = name; // nombre más completo
            if (when > c.lastActivity) c.lastActivity = when;
            return c;
        };
        for (const o of orders) {
            if (!o.customer_phone) continue;
            const c = touch(o.customer_phone, o.customer_name || '', o.created_at || '');
            c.fromOrders = true;
            c.orders += 1;
            if (o.customer_email && !c.email) c.email = o.customer_email;
            if (normalizeStatus(o.status) === 'delivered') {
                const total = Array.isArray(o.items)
                    ? o.items.reduce((a, it) => a + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0)
                    : (Number(o.total_amount) || 0);
                c.spent += total;
            }
        }
        for (const w of warranties) {
            if (!w.customer_phone) continue;
            const c = touch(w.customer_phone, w.customer_name || '', w.created_at || '');
            c.fromWarranty = true;
            c.warranties += 1;
        }
        // Marca quién está en la lista de marketing.
        for (const c of map.values()) {
            if (c.email && subSet.has(c.email.toLowerCase())) c.subscribed = true;
        }
        return Array.from(map.values()).sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
    }, [orders, warranties, subs]);

    const q = query.trim().toLowerCase();
    const filtered = q === '' ? clients : clients.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q));

    const waLink = (c: Client) => `https://wa.me/${normalizePhone(c.phone)}?text=${encodeURIComponent(`¡Hola ${c.name}! Te escribimos de SCOTT GAMES.`)}`;

    return (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Clientes</h2>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar nombre o celular…"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 w-48"
                    />
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">{clients.length} clientes</span>
                </div>
            </div>
            <p className="text-[11px] text-slate-500 mb-4">Lista unificada desde pedidos y garantías (agrupados por celular).</p>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="text-slate-500 border-b border-slate-800 uppercase">
                        <tr>
                            <th className="pb-3 pr-4">Cliente</th>
                            <th className="pb-3 pr-4">Celular</th>
                            <th className="pb-3 pr-4">Correo</th>
                            <th className="pb-3 pr-4">Pedidos</th>
                            <th className="pb-3 pr-4">Gastado</th>
                            <th className="pb-3 pr-4">Garantías</th>
                            <th className="pb-3 pr-4">Origen</th>
                            <th className="pb-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                        {filtered.length === 0 && (
                            <tr><td colSpan={8} className="py-6 text-center text-slate-500">No hay clientes todavía.</td></tr>
                        )}
                        {filtered.map((c) => (
                            <tr key={c.key} className="hover:bg-slate-950/40 transition align-top">
                                <td className="py-3 pr-4 font-semibold text-white">{c.name || '—'}</td>
                                <td className="py-3 pr-4 text-slate-400 whitespace-nowrap">{c.phone}</td>
                                <td className="py-3 pr-4 text-slate-400">{c.email || '—'}</td>
                                <td className="py-3 pr-4 text-slate-300">{c.orders}</td>
                                <td className="py-3 pr-4 text-emerald-400 font-semibold whitespace-nowrap">{c.spent > 0 ? `S/. ${formatSoles(c.spent)}` : '—'}</td>
                                <td className="py-3 pr-4 text-slate-300">{c.warranties}</td>
                                <td className="py-3 pr-4">
                                    <div className="flex flex-wrap gap-1">
                                        {c.fromOrders && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-300">Pedidos</span>}
                                        {c.fromWarranty && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-300">Garantía</span>}
                                        {c.subscribed && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-300">Suscrito</span>}
                                    </div>
                                </td>
                                <td className="py-3">
                                    <div className="flex items-center justify-end">
                                        <a href={waLink(c)} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded font-bold transition">WhatsApp</a>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
