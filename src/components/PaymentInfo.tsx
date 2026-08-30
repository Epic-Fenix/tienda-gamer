'use client';

import { PAYMENT_INFO, buildComprobanteWhatsappLink, formatSoles, paymentTypeLabel } from '@/lib/payment';

interface Props {
    orderCode: string;
    amount: number; // Monto a enviar como comprobante (total o abono según el tipo)
    isFullPayment?: boolean;
}

export default function PaymentInfo({ orderCode, amount, isFullPayment = false }: Props) {
    return (
        <div className="text-left">
            <div className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-3 ${isFullPayment ? 'bg-emerald-500/15 text-emerald-400' : 'bg-indigo-500/15 text-indigo-300'}`}>
                {paymentTypeLabel(isFullPayment)}
            </div>
            <p className="text-xs text-slate-400 mb-3">
                Realiza {isFullPayment ? 'el pago total de' : 'el abono de'}{' '}
                <span className="font-bold text-emerald-400">S/. {formatSoles(amount)}</span> por
                cualquiera de estos medios y envíanos tu comprobante:
            </p>

            {/* Yape / Plin */}
            <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
                    <div className="inline-block px-2 py-0.5 rounded bg-[#742284] text-white text-[10px] font-black mb-1">YAPE</div>
                    <p className="text-sm font-bold text-white tracking-wide">{PAYMENT_INFO.yapePlinNumber}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
                    <div className="inline-block px-2 py-0.5 rounded bg-[#00bcd4] text-white text-[10px] font-black mb-1">PLIN</div>
                    <p className="text-sm font-bold text-white tracking-wide">{PAYMENT_INFO.yapePlinNumber}</p>
                </div>
            </div>
            <p className="text-[11px] text-slate-500 text-center mb-3">
                Titular: <span className="text-slate-300 font-semibold">{PAYMENT_INFO.accountHolder}</span>
            </p>

            {/* Transferencias bancarias */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-1.5 text-xs mb-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Transferencias</p>
                <div className="flex justify-between gap-2">
                    <span className="text-slate-400">BCP</span>
                    <span className="text-white font-semibold font-mono">{PAYMENT_INFO.bcp}</span>
                </div>
                {PAYMENT_INFO.bcpCci && (
                    <div className="flex justify-between gap-2">
                        <span className="text-slate-500">CCI BCP</span>
                        <span className="text-slate-300 font-mono">{PAYMENT_INFO.bcpCci}</span>
                    </div>
                )}
                <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Interbank</span>
                    <span className="text-white font-semibold font-mono">{PAYMENT_INFO.interbank}</span>
                </div>
                {PAYMENT_INFO.interbankCci && (
                    <div className="flex justify-between gap-2">
                        <span className="text-slate-500">CCI Interbank</span>
                        <span className="text-slate-300 font-mono">{PAYMENT_INFO.interbankCci}</span>
                    </div>
                )}
            </div>

            <a
                href={buildComprobanteWhatsappLink(orderCode, amount, isFullPayment)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition"
            >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
                    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.599 5.35l-.999 3.648 3.9-.297zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                Enviar Comprobante por WhatsApp
            </a>
            <p className="text-[10px] text-slate-500 text-center mt-2">
                Tu reserva se confirma al validar el pago. Código: <span className="font-mono text-indigo-400">{orderCode}</span>
            </p>
        </div>
    );
}
