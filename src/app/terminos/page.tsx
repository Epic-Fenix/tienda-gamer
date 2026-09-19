import Link from 'next/link';
import { STORE, CONTACT } from '@/lib/site';

export const metadata = { title: 'Términos y Condiciones | SCOTT GAMES' };

export default function Terminos() {
    return (
        <main className="min-h-screen bg-[#08080c] text-slate-100 px-4 py-10">
            <div className="max-w-2xl mx-auto">
                <Link href="/" className="text-sm text-[#22d3ee] hover:underline">← Volver</Link>
                <h1 className="font-gamer text-2xl font-black mt-3 mb-4">Términos y Condiciones</h1>
                <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                    <h2 className="font-bold text-white mt-4">Reservas y separaciones</h2>
                    <p>Puedes separar un producto con un adelanto (según el % indicado) o pagarlo al 100%. El saldo se cancela al recoger o antes del envío. La reserva se confirma al validar el pago; el plazo de recojo es de 48 horas salvo acuerdo distinto.</p>
                    <h2 className="font-bold text-white mt-4">Pagos</h2>
                    <p>Aceptamos Yape, Plin y transferencia bancaria. El pedido se confirma cuando verificamos el comprobante.</p>
                    <h2 className="font-bold text-white mt-4">Entrega</h2>
                    <p>Recojo en tienda (Feria Grau) o envío a domicilio/provincia según tarifa mostrada. Envío gratis desde S/.300 en productos.</p>
                    <h2 className="font-bold text-white mt-4">Productos</h2>
                    <p>Vendemos productos nuevos y seminuevos (indicado en cada ficha). Las imágenes son referenciales.</p>
                    <h2 className="font-bold text-white mt-4">Cambios y devoluciones</h2>
                    <p>Los seminuevos se entregan revisados. Ante cualquier inconveniente, contáctanos dentro de las 24 horas.</p>
                    <h2 className="font-bold text-white mt-4">Contacto</h2>
                    <p>{STORE.name} · WhatsApp {CONTACT.whatsappSales} · {CONTACT.email}</p>
                </div>
            </div>
        </main>
    );
}
