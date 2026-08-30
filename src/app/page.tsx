'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types/database';
import ReservationModal from '@/components/ReservationModal';
import BackorderModal from '@/components/BackorderModal';

const FACEBOOK_URL = 'https://www.facebook.com/share/1BrzFx93Wa/?mibextid=wwXIfr';

type Banner = {
  title: string;
  subtitle: string;
  gradient: string;
  cta?: string;
  href?: string;
};

const BANNERS: Banner[] = [
  {
    title: '¡Nuevos ingresos PS5!',
    subtitle: 'Los últimos lanzamientos ya disponibles en stock. ¡No te quedes sin el tuyo!',
    gradient: 'from-indigo-600 via-purple-600 to-blue-700',
  },
  {
    title: 'Preventas exclusivas',
    subtitle: 'Asegura tu juego favorito con solo el 20% de separación y recógelo el día de estreno.',
    gradient: 'from-rose-600 via-pink-600 to-fuchsia-700',
  },
  {
    title: 'Únete a la comunidad',
    subtitle: 'Sorteos, ofertas flash y novedades primero en nuestro Facebook oficial.',
    gradient: 'from-blue-600 via-sky-600 to-cyan-600',
    cta: 'Ir a Facebook',
    href: FACEBOOK_URL,
  },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('Todas');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [backorderProduct, setBackorderProduct] = useState<Product | null>(null);
  const [slide, setSlide] = useState(0);

  const nextSlide = () => setSlide((s) => (s + 1) % BANNERS.length);
  const prevSlide = () => setSlide((s) => (s - 1 + BANNERS.length) % BANNERS.length);

  // Auto-avance del carrusel cada 5s (se reinicia el temporizador al cambiar de slide)
  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slide]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!error && data) setProducts(data);
      setLoading(false);
    };

    fetchProducts();

    const channel = supabase
      .channel('products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setProducts((prev) => [payload.new as Product, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setProducts((prev) => prev.map((p) => (p.id === payload.new.id ? (payload.new as Product) : p)));
        } else if (payload.eventType === 'DELETE') {
          setProducts((prev) => prev.filter((p) => p.id === payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const filter = selectedFilter.toLowerCase();
      const matchesFilter =
        selectedFilter === 'Todas' ||
        (item.platform && item.platform.toLowerCase().includes(filter)) ||
        (item.category && item.category.toLowerCase().includes(filter));

      return matchesSearch && matchesFilter;
    });
  }, [products, searchTerm, selectedFilter]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-wider text-indigo-400">TIENDA GAMER</h1>
          <p className="text-slate-400 text-xs mt-1">Stock en vivo desde tienda física y web</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white bg-[#1877F2] hover:bg-[#0f66d0] transition shadow-lg shadow-blue-900/30"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.313 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
            </svg>
            Síguenos en Facebook
          </a>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Conexión en Vivo
          </span>
        </div>
      </header>

      {/* Carrusel de Banners */}
      <section className="max-w-6xl mx-auto mb-8">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 shadow-xl">
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${slide * 100}%)` }}
          >
            {BANNERS.map((banner, i) => (
              <div
                key={i}
                className={`min-w-full h-48 md:h-60 bg-gradient-to-r ${banner.gradient} px-8 md:px-14 flex flex-col justify-center`}
              >
                <h2 className="text-2xl md:text-4xl font-black text-white drop-shadow-lg">{banner.title}</h2>
                <p className="text-white/90 text-sm md:text-base mt-2 max-w-xl">{banner.subtitle}</p>
                {banner.href && (
                  <a
                    href={banner.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex w-max items-center gap-2 px-4 py-2 rounded-lg bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition"
                  >
                    {banner.cta}
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Flechas de navegación */}
          <button
            onClick={prevSlide}
            aria-label="Anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white text-xl transition"
          >
            ‹
          </button>
          <button
            onClick={nextSlide}
            aria-label="Siguiente"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/30 hover:bg-black/60 text-white text-xl transition"
          >
            ›
          </button>

          {/* Indicadores (dots) */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {BANNERS.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                aria-label={`Ir al banner ${i + 1}`}
                className={`h-2.5 rounded-full transition-all ${i === slide ? 'w-6 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/70'}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Buscador y Filtros */}
      <section className="max-w-6xl mx-auto mb-8 space-y-4">
        <input
          type="text"
          placeholder="Buscar por nombre o descripción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />

        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {['Todas', 'PS5', 'Xbox', 'Nintendo Switch', 'Anime/Coleccionables'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${selectedFilter === cat ? 'bg-indigo-600 text-white' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">{filteredProducts.length} productos encontrados</span>
        </div>
      </section>

      {/* Grilla de Productos */}
      <section className="max-w-6xl mx-auto">
        {loading ? (
          <p className="text-center text-slate-500 py-10">Cargando catálogo...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center text-slate-500 py-10">No se encontraron productos coincidentes.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((item) => (
              <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-indigo-500/50 transition">
                <div>
                  {/* Foto de Producto */}
                  <div className="w-full h-44 mb-4 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800/80">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition duration-300" />
                    ) : (
                      <span className="text-xs text-slate-600">Sin imagen</span>
                    )}
                  </div>

                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded">
                      {item.platform || item.category}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${item.stock > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {item.stock > 0 ? `Stock: ${item.stock}` : 'Agotado'}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-white mb-1">{item.name}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{item.description || 'Sin descripción'}</p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Precio</span>
                    <span className="text-lg font-black text-white">S/. {item.price}</span>
                  </div>
                  {item.stock > 0 ? (
                    <button onClick={() => setSelectedProduct(item)} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition">
                      Separar ({item.min_reservation_pct}%)
                    </button>
                  ) : (
                    <button onClick={() => setBackorderProduct(item)} className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition">
                      Encargar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto mt-16 pt-8 border-t border-slate-800">
        <div className="bg-gradient-to-r from-indigo-950/40 to-blue-950/40 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-black text-white">¡Únete a nuestra comunidad gamer!</h3>
            <p className="text-sm text-slate-400 mt-1">Ofertas, sorteos y novedades primero en nuestro Facebook oficial.</p>
          </div>
          <a
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-[#1877F2] hover:bg-[#0f66d0] transition shadow-lg shadow-blue-900/40 whitespace-nowrap"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
              <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.313 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
            </svg>
            Visita nuestra comunidad
          </a>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-6 text-xs text-slate-500">
          <p className="font-black tracking-wider text-slate-400">TIENDA GAMER</p>
          <p>© {new Date().getFullYear()} Tienda Gamer. Todos los derechos reservados.</p>
          <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="text-[#4a94f5] hover:text-white transition">
            Facebook Oficial
          </a>
        </div>
      </footer>

      {selectedProduct && <ReservationModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
      {backorderProduct && <BackorderModal product={backorderProduct} onClose={() => setBackorderProduct(null)} />}
    </main>
  );
}