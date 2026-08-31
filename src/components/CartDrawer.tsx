'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/CartContext';
import { formatSoles, PAYMENT_INFO } from '@/lib/payment';
import { orderUrl } from '@/lib/site';
import PaymentInfo from '@/components/PaymentInfo';
import { Coupon } from '@/types/database';
import { QRCodeSVG } from 'qrcode.react';

interface SuccessOrder {
    code: string;
    reservation: number;
    pending: number;
    isFull: boolean;
}

export default function CartDrawer() {
    const { items, isOpen, count, total, reservationTotal, pendingTotal, openCart, closeCart, setQuantity, removeItem, clear } = useCart();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [fullPayment, setFullPayment] = useState(false);
    const [deliveryType, setDeliveryType] = useState<'pickup' | 'shipping'>('pickup');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<SuccessOrder | null>(null);

    // Cupón de descuento
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [couponMsg, setCouponMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);

    const round2 = (n: number) => Number(n.toFixed(2));

    // Descuento aplicado por el cupón.
    const discount = appliedCoupon
        ? appliedCoupon.discount_type === 'percent'
            ? (total * appliedCoupon.discount_value) / 100
            : Math.min(appliedCoupon.discount_value, total)
        : 0;
    const netTotal = Math.max(0, total - discount);

    // Montos a mostrar según la modalidad elegida (sobre el total con descuento).
    const payNow = fullPayment ? netTotal : Math.min(reservationTotal, netTotal);
    const payLater = round2(netTotal - payNow);

    // Enlace de checkout por WhatsApp con el resumen del pedido.
    const whatsappCheckoutLink = () => {
        const digits = PAYMENT_INFO.whatsapp.replace(/\D/g, '');
        const lista = items.map((i) => `• ${i.quantity}x ${i.name} — S/. ${formatSoles(i.price * i.quantity)}`).join('\n');
        const entrega = deliveryType === 'pickup' ? 'Recojo en tienda' : 'Envío a domicilio';
        const msg =
            `🎮 *NUEVO PEDIDO - SCOTT GAMES LIMA*\n` +
            `----------------------------------\n` +
            `Productos:\n${lista}\n` +
            `Total: S/. ${formatSoles(netTotal)}\n` +
            `Tipo de entrega: ${entrega}\n` +
            `----------------------------------\n` +
            `¡Hola! Quiero confirmar mi compra.`;
        return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
    };

    const applyCoupon = async () => {
        const codeInput = couponCode.trim().toUpperCase();
        if (codeInput === '') return;
        setCouponLoading(true);
        setCouponMsg(null);
        const { data } = await supabase
            .from('coupons')
            .select('*')
            .ilike('code', codeInput)
            .eq('is_active', true)
            .limit(1);
        const found = (data as Coupon[] | null)?.[0];
        if (!found) {
            setAppliedCoupon(null);
            setCouponMsg({ ok: false, text: 'Cupón inválido o inactivo.' });
        } else if (found.max_uses != null && (found.uses_count ?? 0) >= found.max_uses) {
            // Cupón agotó su límite de usos.
            setAppliedCoupon(null);
            setCouponMsg({ ok: false, text: 'Este cupón ya alcanzó su límite de usos.' });
        } else {
            setAppliedCoupon(found);
            setCouponMsg({
                ok: true,
                text: found.discount_type === 'percent'
                    ? `Cupón aplicado: ${found.discount_value}% de descuento`
                    : `Cupón aplicado: S/. ${formatSoles(found.discount_value)} de descuento`,
            });
        }
        setCouponLoading(false);
    };

    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode('');
        setCouponMsg(null);
    };

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) return;
        setLoading(true);

        const orderCode = `CART-${Math.floor(100000 + Math.random() * 900000)}`;
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + 48);

        const totalAmount = round2(netTotal);
        const reservation = fullPayment ? totalAmount : round2(Math.min(reservationTotal, netTotal));
        const pending = round2(totalAmount - reservation);

        // Ítems que se guardan como JSON en la orden (sin el campo interno `stock`).
        const orderItems = items.map((i) => ({
            product_id: i.product_id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            image_url: i.image_url ?? null,
            min_reservation_pct: i.min_reservation_pct ?? 0,
        }));

        const { error } = await supabase.from('orders').insert({
            order_code: orderCode,
            product_id: items[0]?.product_id ?? null,
            customer_name: name,
            customer_phone: phone,
            customer_email: email.trim() !== '' ? email.trim() : null,
            delivery_type: deliveryType,
            total_amount: totalAmount,
            paid_amount: reservation,
            pending_amount: pending,
            pickup_deadline: deadline.toISOString(),
            status: 'reserved',
            is_full_payment: fullPayment,
            coupon_code: appliedCoupon?.code ?? null,
            discount_amount: round2(discount),
            items: orderItems,
        });

        if (error) {
            alert('Error al generar la reserva: ' + error.message);
            setLoading(false);
            return;
        }

        // Descuenta stock de cada producto (lee el valor actual antes de restar).
        for (const it of items) {
            const { data } = await supabase.from('products').select('stock').eq('id', it.product_id).single();
            const current = Number(data?.stock) || 0;
            await supabase.from('products').update({ stock: Math.max(0, current - it.quantity) }).eq('id', it.product_id);
        }

        // Registra el uso del cupón (incrementa uses_count).
        if (appliedCoupon) {
            await supabase
                .from('coupons')
                .update({ uses_count: (appliedCoupon.uses_count ?? 0) + 1 })
                .eq('id', appliedCoupon.id);
        }

        setSuccess({ code: orderCode, reservation, pending, isFull: fullPayment });
        setLoading(false);
    };

    const handleCloseSuccess = () => {
        clear();
        setSuccess(null);
        setName('');
        setPhone('');
        setEmail('');
        setFullPayment(false);
        setDeliveryType('pickup');
        removeCoupon();
        closeCart();
    };

    return (
        <>
            {/* Botón flotante del carrito */}
            <button
                onClick={openCart}
                aria-label="Abrir carrito"
                className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-900/50 flex items-center justify-center transition"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                {count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center border-2 border-slate-950">
                        {count}
                    </span>
                )}
            </button>

            {/* Overlay + Drawer */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={success ? undefined : closeCart} />
                    <aside className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-800">
                            <h2 className="text-lg font-black text-white">
                                {success ? '¡Reserva Confirmada!' : 'Tu Carrito'}
                            </h2>
                            <button onClick={success ? handleCloseSuccess : closeCart} className="text-slate-400 hover:text-white text-2xl leading-none" aria-label="Cerrar">×</button>
                        </div>

                        {/* Contenido */}
                        {success ? (
                            <div className="flex-1 overflow-y-auto p-5 space-y-5">
                                <div className="text-center">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-2xl font-bold mb-2">✓</div>
                                    <p className="text-xs text-slate-400">Código de tu reserva</p>
                                    <p className="text-xl font-mono font-black text-indigo-400">{success.code}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl w-max mx-auto">
                                    <QRCodeSVG value={orderUrl(success.code)} size={150} />
                                </div>
                                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
                                    <div className="flex justify-between font-bold"><span className="text-emerald-400">{success.isFull ? 'Pago total:' : 'Abono a separar:'}</span><span>S/. {formatSoles(success.reservation)}</span></div>
                                    <div className="flex justify-between font-bold text-amber-400"><span>Saldo pendiente:</span><span>S/. {formatSoles(success.pending)}</span></div>
                                </div>
                                <PaymentInfo orderCode={success.code} amount={success.reservation} isFullPayment={success.isFull} />
                                <button onClick={handleCloseSuccess} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition">
                                    Seguir comprando
                                </button>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                                <div className="text-4xl mb-3">🛒</div>
                                <p className="text-sm">Tu carrito está vacío.</p>
                                <button onClick={closeCart} className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition">Ver catálogo</button>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                                    {items.map((it) => (
                                        <div key={it.product_id} className="flex gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3">
                                            <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800">
                                                {it.image_url ? (
                                                    <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[9px] text-slate-600">Sin foto</span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-white truncate">{it.name}</p>
                                                <p className="text-xs text-slate-400">S/. {formatSoles(it.price)} c/u</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button onClick={() => setQuantity(it.product_id, it.quantity - 1)} className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">−</button>
                                                    <span className="text-sm font-bold text-white w-6 text-center">{it.quantity}</span>
                                                    <button onClick={() => setQuantity(it.product_id, it.quantity + 1)} disabled={!!it.stock && it.quantity >= it.stock} className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold disabled:opacity-30 disabled:cursor-not-allowed">+</button>
                                                    <button onClick={() => removeItem(it.product_id)} className="ml-auto text-[11px] text-rose-400 hover:text-rose-300">Quitar</button>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm font-black text-white">S/. {formatSoles(it.price * it.quantity)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Totales + formulario */}
                                <div className="border-t border-slate-800 p-5 space-y-3">
                                    {/* Barra de progreso hacia envío gratis (umbral S/. 300) */}
                                    {(() => {
                                        const THRESHOLD = 300;
                                        const remaining = Math.max(0, THRESHOLD - total);
                                        const pct = Math.min(100, (total / THRESHOLD) * 100);
                                        const unlocked = remaining <= 0;
                                        return (
                                            <div className={`rounded-lg border p-3 ${unlocked ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-950 border-slate-800'}`}>
                                                <p className={`text-[11px] font-semibold ${unlocked ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                    {unlocked
                                                        ? '🎉 ¡Felicidades! Tienes Envío Gratis'
                                                        : <>🚚 Agrega <span className="text-white font-bold">S/. {formatSoles(remaining)}</span> más para obtener ¡Envío Gratis!</>}
                                                </p>
                                                <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                                    <div className={`h-full rounded-full transition-all duration-500 ${unlocked ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Selector de modalidad de pago */}
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Modalidad de pago</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setFullPayment(true)}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${fullPayment ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                                            >
                                                {fullPayment ? '🔵' : '⚪'} Pagar Total (100%)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFullPayment(false)}
                                                className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${!fullPayment ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}
                                            >
                                                {!fullPayment ? '🔵' : '⚪'} Separar / Adelanto
                                            </button>
                                        </div>
                                    </div>
                                    {/* Cupón de descuento */}
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Cupón de descuento</p>
                                        {appliedCoupon ? (
                                            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                                                <span className="text-xs font-bold text-emerald-400 font-mono">{appliedCoupon.code}</span>
                                                <button type="button" onClick={removeCoupon} className="text-[11px] text-slate-400 hover:text-white">Quitar</button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={couponCode}
                                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                    placeholder="Ingresa tu código"
                                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white uppercase placeholder:normal-case focus:outline-none focus:border-indigo-500"
                                                />
                                                <button type="button" onClick={applyCoupon} disabled={couponLoading} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition disabled:opacity-50">
                                                    {couponLoading ? '...' : 'Aplicar'}
                                                </button>
                                            </div>
                                        )}
                                        {couponMsg && (
                                            <p className={`text-[11px] mt-1 ${couponMsg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{couponMsg.text}</p>
                                        )}
                                    </div>

                                    {/* Tipo de entrega */}
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Tipo de entrega</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button type="button" onClick={() => setDeliveryType('pickup')} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${deliveryType === 'pickup' ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}>
                                                🏬 Recojo en tienda
                                            </button>
                                            <button type="button" onClick={() => setDeliveryType('shipping')} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${deliveryType === 'shipping' ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'}`}>
                                                🚚 Envío a domicilio
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-xs space-y-1">
                                        <div className="flex justify-between text-slate-400"><span>Subtotal ({count} art.):</span><span className="font-bold text-white">S/. {formatSoles(total)}</span></div>
                                        {discount > 0 && (
                                            <>
                                                <div className="flex justify-between text-emerald-400"><span>Descuento cupón:</span><span className="font-bold">− S/. {formatSoles(discount)}</span></div>
                                                <div className="flex justify-between text-slate-300"><span>Total con descuento:</span><span className="font-bold">S/. {formatSoles(netTotal)}</span></div>
                                            </>
                                        )}
                                        <div className="flex justify-between text-indigo-400"><span>{fullPayment ? 'A pagar ahora (100%):' : 'Abono a separar:'}</span><span className="font-bold">S/. {formatSoles(payNow)}</span></div>
                                        <div className="flex justify-between text-slate-400"><span>Saldo pendiente:</span><span>S/. {formatSoles(payLater)}</span></div>
                                    </div>

                                    {/* Checkout directo por WhatsApp */}
                                    <a
                                        href={whatsappCheckoutLink()}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black transition"
                                    >
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.599 5.35l-.999 3.648 3.9-.297zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                                        Finalizar Pedido por WhatsApp
                                    </a>
                                    <p className="text-center text-[10px] text-slate-500">o genera tu reserva con QR y datos de pago ↓</p>

                                    <form onSubmit={handleConfirm} className="space-y-2">
                                        <input required type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo *" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
                                        <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="WhatsApp / Celular *" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
                                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo (opcional)" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
                                        <button type="submit" disabled={loading} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition disabled:opacity-50">
                                            {loading ? 'Generando...' : 'Confirmar Reserva del Carrito'}
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </aside>
                </div>
            )}
        </>
    );
}
