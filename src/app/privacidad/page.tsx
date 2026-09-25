import Link from 'next/link';
import { STORE, CONTACT } from '@/lib/site';

export const metadata = { title: 'Política de Privacidad | SCOTT GAMES' };

export default function Privacidad() {
    return (
        <main className="min-h-screen bg-[#08080c] text-slate-100 px-4 py-10">
            <div className="max-w-2xl mx-auto">
                <Link href="/" className="text-sm text-[#22d3ee] hover:underline">← Volver</Link>
                <h1 className="font-gamer text-2xl font-black mt-3 mb-4">Política de Privacidad</h1>
                <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                    <p>En {STORE.name} respetamos tu privacidad y cumplimos la Ley N.° 29733 (Protección de Datos Personales del Perú).</p>
                    <h2 className="font-bold text-white mt-4">Qué datos recopilamos</h2>
                    <p>Al reservar o comprar recogemos: nombre, teléfono/WhatsApp, correo (opcional) y dirección (solo para envío a domicilio/provincia). Los usamos únicamente para procesar y entregar tu pedido y coordinar el pago.</p>
                    <h2 className="font-bold text-white mt-4">Uso del correo y marketing</h2>
                    <p>El correo es opcional. Si te suscribes a nuestras novedades o lo brindas al comprar y aceptas la casilla de consentimiento, podremos enviarte ofertas, nuevos ingresos y promociones. Puedes darte de baja cuando quieras escribiéndonos a <a href={`mailto:${CONTACT.email}`} className="text-[#22d3ee]">{CONTACT.email}</a>.</p>
                    <h2 className="font-bold text-white mt-4">Cookies y analítica</h2>
                    <p>Usamos cookies esenciales para que la tienda funcione (carrito, sesión). Con tu consentimiento, también usamos cookies de analítica (por ejemplo Google Analytics) para entender cómo se usa el sitio y mejorarlo; la IP se anonimiza. Al entrar te mostramos un aviso para aceptar o rechazar la analítica, y puedes cambiar tu elección borrando las cookies del navegador.</p>
                    <h2 className="font-bold text-white mt-4">Con quién se comparte</h2>
                    <p>No vendemos ni cedemos tus datos. Se procesan en nuestros proveedores de infraestructura (base de datos y correo) solo para operar la tienda.</p>
                    <h2 className="font-bold text-white mt-4">Tus derechos</h2>
                    <p>Puedes solicitar acceso, rectificación o eliminación de tus datos escribiéndonos a <a href={`mailto:${CONTACT.email}`} className="text-[#22d3ee]">{CONTACT.email}</a> o al WhatsApp {CONTACT.whatsappSales}.</p>
                    <h2 className="font-bold text-white mt-4">Contacto</h2>
                    <p>{STORE.name} · {STORE.address}</p>
                </div>
            </div>
        </main>
    );
}
