'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Order, Backorder, BackorderStatus } from '@/types/database';
import Link from 'next/link';
import BannerManager from '@/components/admin/BannerManager';
import CouponManager from '@/components/admin/CouponManager';
import PackingSlipModal from '@/components/admin/PackingSlipModal';
import TradeInManager from '@/components/admin/TradeInManager';
import CoverSearch from '@/components/admin/CoverSearch';
import { ORDER_STATUS_OPTIONS, normalizeStatus } from '@/lib/orderStatus';
import { SITE_URL } from '@/lib/site';

export default function AdminDashboard() {
    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [backorders, setBackorders] = useState<Backorder[]>([]);
    const [loading, setLoading] = useState(true);

    // Autenticación con Supabase Auth
    const [authorized, setAuthorized] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [adminEmail, setAdminEmail] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    // Recuperación de contraseña
    const [authView, setAuthView] = useState<'login' | 'forgot'>('login');
    const [resetEmail, setResetEmail] = useState('');
    const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [resetLoading, setResetLoading] = useState(false);

    // Formulario nuevo producto
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [costPrice, setCostPrice] = useState('');
    const [oldPrice, setOldPrice] = useState('');
    const [stock, setStock] = useState('');
    const [category, setCategory] = useState('Videojuegos');
    const [platform, setPlatform] = useState('PS5');
    const [condition, setCondition] = useState('nuevo');
    const [minPct, setMinPct] = useState('20');
    const [imageUrl, setImageUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Edición / eliminación de productos
    const [editProduct, setEditProduct] = useState<Product | null>(null);
    const [editForm, setEditForm] = useState({ name: '', price: '', cost_price: '', old_price: '', stock: '', description: '', image_url: '', condition: 'nuevo', platform: '', category: '' });
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

    // Etiqueta de envío
    const [packingOrder, setPackingOrder] = useState<Order | null>(null);

    // Valida la sesión activa de Supabase Auth al montar y escucha cambios.
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setAuthorized(!!data.session);
            setAdminEmail(data.session?.user?.email ?? '');
            setAuthChecked(true);
        });

        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
            setAuthorized(!!session);
            setAdminEmail(session?.user?.email ?? '');
        });

        return () => {
            sub.subscription.unsubscribe();
        };
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        if (error) {
            setAuthError('Credenciales incorrectas o cuenta no autorizada.');
        } else {
            setPassword('');
        }
        setAuthLoading(false);
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetLoading(true);
        setResetMsg(null);
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
            redirectTo: `${SITE_URL}/admin/reset-password`,
        });
        if (error) {
            setResetMsg({ ok: false, text: 'No se pudo enviar el correo. Verifica la dirección.' });
        } else {
            setResetMsg({ ok: true, text: 'Te enviamos un enlace de recuperación. Revisa tu correo.' });
        }
        setResetLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setAuthorized(false);
    };

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
        if (!authorized) return; // No cargar datos sin sesión válida
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
    }, [authorized]);

    const handleUpdateStock = async (id: string, currentStock: number, delta: number) => {
        const nextStock = Math.max(0, currentStock + delta);
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, stock: nextStock } : p)));
        await supabase.from('products').update({ stock: nextStock }).eq('id', id);
    };

    // Cambia el estado de una orden (se refleja en vivo en el rastreador del cliente).
    const handleUpdateOrderStatus = async (id: string, status: string) => {
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
        const { error } = await supabase.from('orders').update({ status }).eq('id', id);
        if (error) {
            alert('Error al actualizar el estado: ' + error.message);
            fetchData();
        }
    };

    // Normaliza el teléfono a formato internacional peruano para wa.me (51 + 9 dígitos)
    const buildWhatsappLink = (bo: Backorder) => {
        const digits = (bo.customer_phone || '').replace(/\D/g, '');
        // Evita duplicar el código de país si el cliente ya lo incluyó
        const local = digits.startsWith('51') && digits.length > 9 ? digits.slice(2) : digits;
        const productName = bo.product?.name ?? 'tu producto encargado';
        const message =
            `¡Hola ${bo.customer_name}! Te escribimos de SCOTT GAMES. ` +
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

    // Sube un archivo de imagen al bucket público `product-images` y devuelve la URL.
    const uploadImage = async (file: File, setter: (url: string) => void) => {
        setUploading(true);
        try {
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { error } = await supabase.storage.from('product-images').upload(path, file, {
                cacheControl: '3600',
                upsert: false,
            });
            if (error) {
                alert('Error al subir la imagen: ' + error.message + '\n(¿Existe el bucket público "product-images" en Supabase Storage?)');
                return;
            }
            const { data } = supabase.storage.from('product-images').getPublicUrl(path);
            setter(data.publicUrl);
        } finally {
            setUploading(false);
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
            cost_price: Number(costPrice) || 0,
            old_price: oldPrice.trim() !== '' ? Number(oldPrice) : null,
            stock: Number(stock),
            min_reservation_pct: Number(minPct),
            image_url: imageUrl.trim() !== '' ? imageUrl.trim() : null,
            allow_reservation: true,
            condition
        }).select().single();

        if (error) {
            alert('Error: ' + error.message);
        } else {
            if (data) setProducts((prev) => [...prev, data as Product].sort((a, b) => a.name.localeCompare(b.name)));
            setShowModal(false);
            setName('');
            setPrice('');
            setCostPrice('');
            setOldPrice('');
            setStock('');
            setImageUrl('');
            setCondition('nuevo');
        }
        setSaving(false);
    };

    const openEditModal = (p: Product) => {
        setEditProduct(p);
        setEditForm({
            name: p.name,
            price: String(p.price),
            cost_price: p.cost_price != null ? String(p.cost_price) : '',
            old_price: p.old_price != null ? String(p.old_price) : '',
            stock: String(p.stock),
            description: p.description ?? '',
            image_url: p.image_url ?? '',
            condition: p.condition || 'nuevo',
            platform: p.platform || '',
            category: p.category || '',
        });
    };

    const handleUpdateProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editProduct) return;
        setSaving(true);

        const updates = {
            name: editForm.name,
            price: Number(editForm.price),
            cost_price: Number(editForm.cost_price) || 0,
            old_price: editForm.old_price.trim() !== '' ? Number(editForm.old_price) : null,
            stock: Number(editForm.stock),
            description: editForm.description.trim() !== '' ? editForm.description.trim() : null,
            image_url: editForm.image_url.trim() !== '' ? editForm.image_url.trim() : null,
            condition: editForm.condition,
            platform: editForm.platform.trim() !== '' ? editForm.platform.trim() : null,
            category: editForm.category.trim() !== '' ? editForm.category.trim() : null,
        };

        // Optimistic UI
        setProducts((prev) =>
            prev.map((p) =>
                p.id === editProduct.id
                    ? { ...p, name: updates.name, price: updates.price, cost_price: updates.cost_price, old_price: updates.old_price, stock: updates.stock, description: updates.description ?? undefined, image_url: updates.image_url, condition: updates.condition, platform: updates.platform ?? p.platform, category: updates.category ?? p.category }
                    : p
            )
        );

        const { error } = await supabase.from('products').update(updates).eq('id', editProduct.id);
        if (error) {
            alert('Error al actualizar el producto: ' + error.message);
            fetchData();
        }
        setEditProduct(null);
        setSaving(false);
    };

    const handleDeleteProduct = async () => {
        if (!deleteTarget) return;
        const id = deleteTarget.id;

        // Optimistic UI
        setProducts((prev) => prev.filter((p) => p.id !== id));

        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
            alert('Error al eliminar el producto: ' + error.message);
            fetchData();
        }
        setDeleteTarget(null);
    };

    // KPIs reactivos: se recalculan al cambiar productos, órdenes o backorders.
    const kpis = useMemo(() => {
        const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
        const inventoryValue = products.reduce((sum, p) => sum + (Number(p.stock) || 0) * (Number(p.price) || 0), 0);
        const pendingRevenue = orders
            .filter((o) => o.status === 'reserved')
            .reduce((sum, o) => sum + (Number(o.pending_amount) || 0), 0);
        const waitingClients = backorders.filter((b) => b.status === 'pending').length;
        // Ganancia bruta proyectada: (precio - costo) por unidad en stock.
        const projectedProfit = products.reduce(
            (sum, p) => sum + ((Number(p.price) || 0) - (Number(p.cost_price) || 0)) * (Number(p.stock) || 0),
            0
        );
        return { totalStock, inventoryValue, pendingRevenue, waitingClients, projectedProfit };
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

    // Evita el parpadeo del login antes de resolver la sesión
    if (!authChecked) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Cargando...</div>;

    // Pantalla de login (Supabase Auth)
    if (!authorized) {
        return (
            <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                    <div className="text-center mb-6">
                        <div className="w-14 h-14 rounded-full bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center text-2xl mb-3">🔒</div>
                        <h1 className="text-lg font-black text-white">SCOTT GAMES · Admin</h1>
                        <p className="text-xs text-slate-400 mt-1">
                            {authView === 'login' ? 'Inicia sesión con tu cuenta de administrador.' : 'Recupera el acceso a tu cuenta.'}
                        </p>
                    </div>

                    {authView === 'login' ? (
                        <>
                            <form onSubmit={handleLogin} className="space-y-3">
                                <input
                                    autoFocus
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setAuthError(''); }}
                                    placeholder="correo@scottgames.com"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                                />
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
                                        placeholder="Contraseña"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pr-11 text-white text-sm focus:outline-none focus:border-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-base"
                                    >
                                        {showPassword ? '🙈' : '👁️'}
                                    </button>
                                </div>
                                {authError && <p className="text-xs text-rose-400 text-center">{authError}</p>}
                                <button type="submit" disabled={authLoading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition disabled:opacity-50">
                                    {authLoading ? 'Ingresando...' : 'Ingresar'}
                                </button>
                            </form>
                            <button
                                onClick={() => { setAuthView('forgot'); setResetEmail(email); setResetMsg(null); }}
                                className="block w-full text-center text-xs text-indigo-400 hover:text-indigo-300 mt-3 transition"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </>
                    ) : (
                        <>
                            <form onSubmit={handleForgotPassword} className="space-y-3">
                                <input
                                    autoFocus
                                    type="email"
                                    required
                                    value={resetEmail}
                                    onChange={(e) => { setResetEmail(e.target.value); setResetMsg(null); }}
                                    placeholder="correo@scottgames.com"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                                />
                                {resetMsg && <p className={`text-xs text-center ${resetMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{resetMsg.text}</p>}
                                <button type="submit" disabled={resetLoading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition disabled:opacity-50">
                                    {resetLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                                </button>
                            </form>
                            <button
                                onClick={() => { setAuthView('login'); setResetMsg(null); }}
                                className="block w-full text-center text-xs text-slate-400 hover:text-white mt-3 transition"
                            >
                                ← Volver al inicio de sesión
                            </button>
                        </>
                    )}

                    <Link href="/" className="block text-center text-xs text-slate-500 hover:text-slate-300 mt-5 transition">
                        ← Volver al catálogo
                    </Link>
                </div>
            </main>
        );
    }

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
                        {adminEmail && <span className="self-center text-[11px] text-slate-500 max-w-[160px] truncate" title={adminEmail}>{adminEmail}</span>}
                        <button onClick={handleLogout} className="px-4 py-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg text-xs font-bold transition">
                            Cerrar Sesión
                        </button>
                    </div>
                </header>

                {/* KPIs / Métricas */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ganancia Bruta Proyectada</p>
                        <p className="mt-2 text-2xl font-black text-teal-400">S/. {money(kpis.projectedProfit)}</p>
                        <p className="text-[11px] text-slate-500 mt-1">margen del stock actual</p>
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
                                    <th className="pb-3 text-right">Costo</th>
                                    <th className="pb-3 text-right">Precio</th>
                                    <th className="pb-3 text-right">Margen</th>
                                    <th className="pb-3 text-center">Stock</th>
                                    <th className="pb-3 text-center">Ajuste</th>
                                    <th className="pb-3 text-right">Acciones</th>
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
                                        <td className="py-3 font-semibold text-white">
                                            {item.name}
                                            <span className={`ml-2 align-middle text-[9px] font-bold px-1.5 py-0.5 rounded ${item.condition === 'segunda_mano' ? 'bg-purple-500/15 text-purple-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                                                {item.condition === 'segunda_mano' ? 'Seminuevo' : 'Nuevo'}
                                            </span>
                                        </td>
                                        <td className="py-3 text-slate-400">{item.platform || item.category}</td>
                                        <td className="py-3 text-right text-slate-400">S/. {Number(item.cost_price || 0).toFixed(2)}</td>
                                        <td className="py-3 text-right font-bold text-slate-200">S/. {Number(item.price).toFixed(2)}</td>
                                        <td className="py-3 text-right">
                                            {(() => {
                                                const price = Number(item.price) || 0;
                                                const cost = Number(item.cost_price) || 0;
                                                const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
                                                return (
                                                    <span className={`font-bold ${margin >= 30 ? 'text-emerald-400' : margin > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                        {margin.toFixed(0)}%
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="py-3 text-center">
                                            <span className={`px-2.5 py-1 rounded-full font-bold ${item.stock > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                {item.stock} unid.
                                            </span>
                                        </td>
                                        <td className="py-3 text-center space-x-1 whitespace-nowrap">
                                            <button onClick={() => handleUpdateStock(item.id, item.stock, -1)} className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold">-1</button>
                                            <button onClick={() => handleUpdateStock(item.id, item.stock, 1)} className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 rounded font-bold">+1</button>
                                        </td>
                                        <td className="py-3 text-right space-x-1 whitespace-nowrap">
                                            <button onClick={() => openEditModal(item)} className="px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white rounded font-bold transition">Editar</button>
                                            <button onClick={() => setDeleteTarget(item)} className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded font-bold transition">Eliminar</button>
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
                                            <select
                                                value={normalizeStatus(ord.status)}
                                                onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                                                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500"
                                            >
                                                {ORDER_STATUS_OPTIONS.map((o) => (
                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-3 text-right whitespace-nowrap space-x-2">
                                            <button onClick={() => setPackingOrder(ord)} className="text-xs text-slate-300 hover:text-white" title="Etiqueta de despacho">📦 Etiqueta</button>
                                            <a href={`/order/${ord.order_code}`} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-400 hover:underline" title="Abrir boleta en nueva pestaña">🧾 Boleta ↗</a>
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

                {/* Gestor de banners del carrusel */}
                <BannerManager />

                {/* Gestor de cupones de descuento */}
                <CouponManager />

                {/* Solicitudes de trueque */}
                <TradeInManager />
            </div>

            {/* Modal Nuevo Producto */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-white mb-4">Agregar Producto al Almacén</h3>
                        <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
                            <div>
                                <label className="text-slate-400 block mb-1">Nombre del Producto</label>
                                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" placeholder="Ej. EA Sports FC 25" />
                            </div>
                            <div>
                                <label className="text-slate-400 block mb-1">Imagen del Producto (Opcional)</label>
                                <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" placeholder="Pega una URL o sube un archivo ↓" />
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, setImageUrl); }}
                                        className="text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-indigo-600/30 file:text-indigo-300 file:text-[11px] file:font-bold hover:file:bg-indigo-600 hover:file:text-white"
                                    />
                                    {uploading && <span className="text-[11px] text-amber-400">Subiendo...</span>}
                                    {imageUrl && !uploading && <img src={imageUrl} alt="preview" className="w-8 h-8 object-cover rounded border border-slate-700" />}
                                </div>
                                <CoverSearch query={name} onSelect={setImageUrl} />
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
                                    <label className="text-slate-400 block mb-1">Costo Adquisición</label>
                                    <input type="number" step="0.01" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="text-slate-400 block mb-1">Precio anterior / Tachado</label>
                                    <input type="number" step="0.01" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" placeholder="Opcional" />
                                </div>
                                <div>
                                    <label className="text-slate-400 block mb-1">Condición</label>
                                    <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white">
                                        <option value="nuevo">Nuevo</option>
                                        <option value="segunda_mano">Segunda mano</option>
                                    </select>
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
                                <button type="submit" disabled={saving || uploading} className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition disabled:opacity-50">
                                    {saving ? 'Guardando...' : uploading ? 'Subiendo imagen...' : 'Crear Producto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Editar Producto */}
            {editProduct && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-white mb-4">Editar: <span className="text-indigo-400">{editProduct.name}</span></h3>
                        <form onSubmit={handleUpdateProduct} className="space-y-3 text-xs">
                            <div>
                                <label className="text-slate-400 block mb-1">Nombre del Producto</label>
                                <input required type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" />
                            </div>
                            <div>
                                <label className="text-slate-400 block mb-1">Descripción</label>
                                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white resize-none" placeholder="Descripción del producto" />
                            </div>
                            <div>
                                <label className="text-slate-400 block mb-1">Imagen del Producto</label>
                                <input type="url" value={editForm.image_url} onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" placeholder="Pega una URL o sube un archivo ↓" />
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, (url) => setEditForm((prev) => ({ ...prev, image_url: url }))); }}
                                        className="text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-indigo-600/30 file:text-indigo-300 file:text-[11px] file:font-bold hover:file:bg-indigo-600 hover:file:text-white"
                                    />
                                    {uploading && <span className="text-[11px] text-amber-400">Subiendo...</span>}
                                    {editForm.image_url && !uploading && <img src={editForm.image_url} alt="preview" className="w-8 h-8 object-cover rounded border border-slate-700" />}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">Recomendado: 600×900 px (vertical 2:3) · Máx. 500 KB (JPG/WebP)</p>
                                <CoverSearch query={editForm.name} onSelect={(url) => setEditForm((prev) => ({ ...prev, image_url: url }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-slate-400 block mb-1">Plataforma</label>
                                    <select value={editForm.platform} onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white">
                                        <option value="">— Selecciona —</option>
                                        <option value="PS5">PS5</option>
                                        <option value="PS4">PS4</option>
                                        <option value="Nintendo Switch">Nintendo Switch</option>
                                        <option value="Xbox">Xbox</option>
                                        <option value="Consolas">Consolas</option>
                                        <option value="Accesorios">Accesorios</option>
                                        <option value="Anime/Coleccionables">Anime/Coleccionables</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-slate-400 block mb-1">Categoría</label>
                                    <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white">
                                        <option value="">— Selecciona —</option>
                                        <option value="Juegos">Juegos</option>
                                        <option value="Consolas">Consolas</option>
                                        <option value="Mandos">Mandos</option>
                                        <option value="Figuras">Figuras</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="text-slate-400 block mb-1">Costo Adquisición</label>
                                    <input type="number" step="0.01" value={editForm.cost_price} onChange={(e) => setEditForm({ ...editForm, cost_price: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="text-slate-400 block mb-1">Precio anterior / Tachado</label>
                                    <input type="number" step="0.01" value={editForm.old_price} onChange={(e) => setEditForm({ ...editForm, old_price: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" placeholder="Opcional" />
                                </div>
                                <div>
                                    <label className="text-slate-400 block mb-1">Condición</label>
                                    <select value={editForm.condition} onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white">
                                        <option value="nuevo">Nuevo</option>
                                        <option value="segunda_mano">Segunda mano</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-slate-400 block mb-1">Precio (S/.)</label>
                                    <input required type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" />
                                </div>
                                <div>
                                    <label className="text-slate-400 block mb-1">Stock</label>
                                    <input required type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white" />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setEditProduct(null)} className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition">Cancelar</button>
                                <button type="submit" disabled={saving || uploading} className="w-1/2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition disabled:opacity-50">
                                    {saving ? 'Guardando...' : uploading ? 'Subiendo imagen...' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Confirmar Eliminación */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl text-center">
                        <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 mx-auto flex items-center justify-center text-2xl mb-3">🗑️</div>
                        <h3 className="text-lg font-bold text-white mb-1">¿Eliminar producto?</h3>
                        <p className="text-xs text-slate-400 mb-5">
                            Se eliminará <strong className="text-white">{deleteTarget.name}</strong> de forma permanente. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setDeleteTarget(null)} className="w-1/2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition">Cancelar</button>
                            <button onClick={handleDeleteProduct} className="w-1/2 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition">Sí, eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Etiqueta de envío / packing slip */}
            {packingOrder && <PackingSlipModal order={packingOrder} onClose={() => setPackingOrder(null)} />}
        </main>
    );
}