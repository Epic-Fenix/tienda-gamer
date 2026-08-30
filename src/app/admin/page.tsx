'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Order, Backorder, BackorderStatus } from '@/types/database';
import Link from 'next/link';

export default function AdminDashboard() {
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [backorders, setBackorders] = useState<Backorder[]>([]);
    const [loading, setLoading] = useState(true);

    // Formulario nuevo producto
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [category, setCategory] = useState('Videojuegos');
    const [platform, setPlatform] = useState('PS5');
    const [minPct, setMinPct] = useState('20');
    const [imageUrl, setImageUrl] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        const { data: prodData } = await supabase.from('products').select('*').order('name', { ascending: true });
        if (prodData) setProducts(prodData);

        // Sin límite: necesitamos todas las órdenes para calcular KPIs (dinero por cobrar).
        // La tabla solo muestra las 10 más recientes vía slice.
        const { data: ordData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (ordData) setOrders(ordData);

        const { data: backData } = await supabase.from('backorders').select('*, product:products(*)').order('created_at', { ascending: false });
        if (backData) setBackorders(backData as any);

        setLoading(false);
    };

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('admin-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setProducts((prev) => [...prev, payload.new as Product].sort((a, b) => a.name.localeCompare(b.name)));
                } else if (payload.eventType === 'UPDATE') {
                    setProducts((prev) => prev.map((p) => (p.id === payload.new.id ? (payload.new as Product) : p)));
                } else if (payload.eventType === 'DELETE') {
                    setProducts((prev) => prev.filter((p) => p.id === payload.old.id));
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'backorders' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleUpdateStock = async (id: string, currentStock: number, delta: number) => {
        const nextStock = Math.max(0, currentStock + delta);
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: nextStock } : p)));
        await supabase.from('products').update({ stock: nextStock }).eq('id', id);
    };

    // Normaliza el teléfono a formato internacional peruano para wa.me (51 + 9 dígitos)
    const buildWhatsappLink = (bo: Backorder) => {
        const digits = (bo.customer_phone || '').replace(/\D/g, '');
        // Evita duplicar el código de país si el cliente ya lo incluyó
        const local = digits.startsWith('51') && digits.length > 9 ? digits.slice(2) : digits;
        const productName = bo.product?.name ?? 'tu producto encargado';
        const message =
            `¡Hola ${bo.customer_name}! Te escribimos de Tienda Gamer. ` +
            `Te avisamos que ya ingresó stock de tu producto encargado: ${productName}. ` +
            `¿Deseas confirmar tu compra o reserva?`;
        return `https://wa.me/51${local}?text=${encodeURIComponent(message)}`;
    };

    const handleUpdateBackorderStatus = async (id: string, status: BackorderStatus) => {
        // Actualización inmediata en pantalla (Optimistic UI)
        setBackorders((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));

        const { error } = await supabase.from('backorders').update({ status }).eq('id', id);
        if (error) {
            alert('Error al actualizar el encargo: ' + error.message);
            fetchData(); // Revierte si falló
        }
    };

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

        const { data, error } = await supabase.from('products').insert({
            name,
            slug: `${slug}-${Math.floor(100 + Math.random() * 900)}`,
            category,
            platform,
            price: Number(price),
            stock: Number(stock),
            min_reservation_pct: Number(minPct),
            image_url: imageUrl.trim() !== '' ? imageUrl.trim() : null,
            allow_reservation: true,
            condition: 'nuevo'
        }).select().single();

        if (error) {
            alert('Error: ' + error.message);
        } else {
            if (data) setProducts((prev) => [...prev, data as Product].sort((a, b) => a.name.localeCompare(b.name)));
            setShowModal(false);
            setName('');
            setPrice('');
            setStock('');
            setImageUrl('');
        }
        setSaving(false);
    };

    // KPIs reactivos: se recalculan al cambiar productos, órdenes o backorders.
    const kpis = useMemo(() => {
        const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
        const inventoryValue = products.reduce((sum, p) => sum + (Number(p.stock) || 0) * (Number(p.price) || 0), 0);
        const pendingRevenue = orders
            .filter((o) => o.status === 'reserved')
            .reduce((sum, o) => sum + (Number(o.pending_amount) || 0), 0);
        const waitingClients = backorders.filter((b) => b.status === 'pending').length;
        return { totalStock, inventoryValue, pendingRevenue, waitingClients };
    }, [products, orders, backorders]);

    const money = (n: number) =>
        n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Genera y descarga un CSV en el cliente (Blob + URL.createObjectURL).
    const downloadCsv = (filename: string, headers: string[], rows: (string | number | null | undefined)[][]) => {
        const escape = (cell: string | number | null | undefined) =>
            `"${String(cell ?? '').replace(/"/g, '""')}"`;
        const lines = [headers, ...rows].map((row) => row.map(escape).join(','));
        // BOM (﻿) para que Excel reconozca UTF-8 (tildes/ñ).
        const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const today = () => new Date().toISOString().slice(0, 10);

    const exportInventory = () => {
        downloadCsv(
            `inventario-${today()}.csv`,
            ['Nombre', 'Categoría', 'Plataforma', 'Precio', 'Stock'],
            products.map((p) => [p.name, p.category, p.platform ?? '', p.price, p.stock])
        );
    };

    const exportOrders = () => {
        downloadCsv(
            `reservas-ventas-${today()}.csv`,
            ['Código', 'Cliente', 'Teléfono', 'Monto Total', 'Saldo Pendiente', 'Estado'],
            orders.map((o) => [o.order_code, o.customer_name, o.customer_phone, o.total_amount, o.pending_amount, o.status])
        );
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando panel...</div>;

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
                    <div>
                        <h1 className="text-2xl font-black text-indigo-400">Control de Inventario & Ventas</h1>
                        <p className="text-xs text-slate-400">Administración general de tienda física y catálogo web</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Link href="/" className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold transition">
                            Ver Catálogo
                        </Link>
                        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition">
                            + Nuevo Producto
                        </button>
                    </div>
                </header>

                {/* KPIs / Métricas */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total en Stock</p>
                        <p className="mt-2 text-2xl font-black text-white">{kpis.totalStock.toLocaleString('es-PE')}</p>
                        <p className="text-[11px] text-slate-500 mt-1">unidades en almacén</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Valorización Inventario</p>
                        <p className="mt-2 text-2xl font-black text-emerald-400">S/. {money(kpis.inventoryValue)}</p>
                        <p className="text-[11px] text-slate-500 mt-1">valor total del stock</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Dinero por Cobrar</p>
                        <p className="mt-2 text-2xl font-black text-amber-400">S/. {money(kpis.pendingRevenue)}</p>
                        <p className="text-[11px] text-slate-500 mt-1">saldos de reservas activas</p>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Clientes en Espera</p>
                        <p className="mt-2 text-2xl font-black text-indigo-400">{kpis.waitingClients.toLocaleString('es-PE')}</p>
                        <p className="text-[11px] text-slate-500 mt-1">encargos pendientes</p>
                    </div>
                </section>

                {/* Exportación de reportes */}
                <section className="flex flex-wrap items-center gap-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Reportes:</span>
                    <button onClick={exportInventory} className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-bold transition">
                        ⬇ Exportar Inventario (CSV)
                    </button>
                    <button onClick={exportOrders} className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 rounded-lg text-xs font-bold transition">
                        ⬇ Exportar Reservas / Ventas (CSV)
                    </button>
                </section>

                {/* Tabla Productos */}
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Stock en Almacén</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="text-slate-500 border-b border-slate-800 uppercase">
                                <tr>
                                    <th className="pb-3">Imagen</th>
                                    <th className="pb-3">Producto</th>
                                    <th className="pb-3">Categoría / Plat.</th>
                                    <th className="pb-3">Precio</th>
                                    <th className="pb-3 text-center">Stock</th>
                                    <th className="pb-3 text-right">Ajuste</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {products.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-950/40 transition">
                                        <td className="py-2">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-10 h-10 object-cover rounded bg-slate-950" />
                                            ) : (
                                                <div className="w-10 h-10 rounded bg-slate-800 text-[9px] flex items-center justify-center text-slate-500">Sin foto</div>
                                            )}
                                        </td>
                                        <td className="py-3 font-semibold text-white">{item.name}</td>
                                        <td className="py-3 text-slate-400">{item.platform || item.category}</td>
                                        <td className="py-3 font-bold text-slate-200">S/. {item.price}</td>
                                        <td className="py-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-full font-bold ${item.stock > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                {item.stock} unid.
                                            </span>
                                        </td>
                                        <td className="py-3 text-right space-x-1">
                                            <button onClick={() => handleUpdateStock(item.id, item.stock, -1)} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold">-1</button>
                                            <button onClick={() => handleUpdateStock(item.id, item.stock, 1)} className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 rounded font-bold">+1</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Órdenes */}
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">Últimas Reservas / Comprobantes</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="text-slate-500 border-b border-slate-800 uppercase">
                                <tr>
                                    <th className="pb-3">Código</th>
                                    <th className="pb-3">Cliente</th>
                                    <th className="pb-3">WhatsApp</th>
                                    <th className="pb-3">Saldo</th>
                                    <th className="pb-3">Estado</th>
                                    <th className="pb-3 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {orders.slice(0, 10).map((ord) => (
                                    <tr key={ord.id} className="hover:bg-slate-950/40 transition">
                                        <td className="py-3 font-mono font-bold text-indigo-400">{ord.order_code}</td>
                                        <td className="py-3 text-white font-medium">{ord.customer_name}</td>
                                        <td className="py-3 text-slate-400">{ord.customer_phone}</td>
                                        <td className="py-3 text-amber-400 font-bold">S/. {ord.pending_amount}</td>
                                        <td className="py-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ord.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                {ord.status === 'completed' ? 'Entregado' : 'Separado'}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <Link href={`/admin/verify/${ord.order_code}`} className="text-xs text-indigo-400 hover:underline">Verificar →</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Encargos / Backorders */}
                <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Encargos de Clientes (Backorders)</h2>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {backorders.filter((b) => b.status === 'pending').length} pendientes
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="text-slate-500 border-b border-slate-800 uppercase">
                                <tr>
                                    <th className="pb-3">Cliente</th>
                                    <th className="pb-3">Teléfono</th>
                                    <th className="pb-3">Producto</th>
                                    <th className="pb-3">Estado</th>
                                    <th className="pb-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {backorders.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-6 text-center text-slate-500">
                                            No hay encargos registrados.
                                        </td>
                                    </tr>
                                )}
                                {backorders.map((bo) => (
                                    <tr key={bo.id} className="hover:bg-slate-950/40 transition">
                                        <td className="py-3 font-semibold text-white">{bo.customer_name}</td>
                                        <td className="py-3 text-slate-400">{bo.customer_phone}</td>
                                        <td className="py-3 text-slate-300">{bo.product?.name ?? '—'}</td>
                                        <td className="py-3">
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${bo.status === 'completed'
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : bo.status === 'notified'
                                                        ? 'bg-sky-500/10 text-sky-400'
                                                        : 'bg-amber-500/10 text-amber-400'
                                                    }`}
                                            >
                                                {bo.status === 'completed'
                                                    ? 'Completado'
                                                    : bo.status === 'notified'
                                                        ? 'Notificado'
                                                        : 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <a
                                                    href={buildWhatsappLink(bo)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded font-bold transition"
                                                    title="Abrir chat de WhatsApp con mensaje predefinido"
                                                >
                                                    WhatsApp
                                                </a>
                                                <button
                                                    onClick={() => handleUpdateBackorderStatus(bo.id, 'notified')}
                                                    disabled={bo.status === 'notified' || bo.status === 'completed'}
                                                    className="px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white rounded font-bold transition disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    Notificado
                                                </button>
                                                <button
                                                    onClick={() => handleUpdateBackorderStatus(bo.id, 'completed')}
                                                    disabled={bo.status === 'completed'}
                                                    className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded font-bold transition disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    Completado
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* Modal Nuevo Producto */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-4">Agregar Producto al Almacén</h3>
                        <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
                            <div>
                                <label className="text-slate-400 block mb-1">Nombre del Producto</label>
                                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" placeholder="Ej. EA Sports FC 25" />
                            </div>
                            <div>
                                <label className="text-slate-400 block mb-1">URL de la Imagen (Opcional)</label>
                                <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" placeholder="https://ejemplo.com/caratula.jpg" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-slate-400 block mb-1">Categoría</label>
                                    <input required type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" />
                                </div>
                                <div>
                                    <label className="text-slate-400 block mb-1">Plataforma</label>
                                    <input required type="text" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-slate-400 block mb-1">Precio (S/.)</label>
                                    <input required type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" />
                                </div>
                                <div>
                                    <label className="text-slate-400 block mb-1">Stock</label>
                                    <input required type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" />
                                </div>
                                <div>
                                    <label className="text-slate-400 block mb-1">% Separar</label>
                                    <input required type="number" value={minPct} onChange={(e) => setMinPct(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition">Cancelar</button>
                                <button type="submit" disabled={saving} className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition disabled:opacity-50">
                                    {saving ? 'Guardando...' : 'Crear Producto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}