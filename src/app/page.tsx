'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types/database';
import ReservationModal from '@/components/ReservationModal';
import BackorderModal from '@/components/BackorderModal';
import CartDrawer from '@/components/CartDrawer';
import SocialProofToasts from '@/components/SocialProofToasts';
import OrderTracker from '@/components/OrderTracker';
import TradeInModal from '@/components/TradeInModal';
import { useCart } from '@/context/CartContext';
import { Banner } from '@/types/database';

type SortOption = 'recientes' | 'precio-asc' | 'precio-desc';

const FACEBOOK_URL = 'https://www.facebook.com/share/1BrzFx93Wa/?mibextid=wwXIfr';

// Diapositiva del carrusel (unifica banners de BD y los de respaldo local).
type Slide = {
  title: string;
  subtitle: string;
  gradient?: string;
  image_url?: string | null;
  cta?: string;
  href?: string;
};

// Banners por defecto (respaldo cuando la tabla `banners` está vacía).
const DEFAULT_SLIDES: Slide[] = [
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
  const [slides, setSlides] = useState<Slide[]>(DEFAULT_SLIDES);

  // Filtros avanzados
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recientes');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'nuevo' | 'segunda_mano'>('all');
  const [tradeInOpen, setTradeInOpen] = useState(false);

  const { addItem } = useCart();

  const nextSlide = () => setSlide((s) => (s + 1) % slides.length);
  const prevSlide = () => setSlide((s) => (s - 1 + slides.length) % slides.length);

  // Carga los banners activos desde Supabase (en tiempo real); si no hay, usa los de respaldo.
  useEffect(() => {
    const loadBanners = async () => {
      const { data } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      if (data && data.length > 0) {
        setSlides(
          (data as Banner[]).map((b) => ({
            title: b.title,
            subtitle: b.subtitle ?? '',
            image_url: b.image_url,
            cta: b.button_text ?? undefined,
            href: b.link_url ?? undefined,
          }))
        );
      } else {
        setSlides(DEFAULT_SLIDES); // Fallback si la tabla queda vacía
      }
      setSlide(0);
    };

    loadBanners();

    // Suscripción realtime: cualquier alta/edición/activación refresca la portada al instante.
    const channel = supabase
      .channel('banners-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => loadBanners())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-avance del carrusel cada 5s (se reinicia el temporizador al cambiar de slide)
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slide, slides.length]);

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
    const min = minPrice.trim() !== '' ? Number(minPrice) : null;
    const max = maxPrice.trim() !== '' ? Number(maxPrice) : null;

    const result = products.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const filter = selectedFilter.toLowerCase();
      const matchesFilter =
        selectedFilter === 'Todas' ||
        (item.platform && item.platform.toLowerCase().includes(filter)) ||
        (item.category && item.category.toLowerCase().includes(filter));

      const matchesMin = min === null || item.price >= min;
      const matchesMax = max === null || item.price <= max;
      const matchesStock = !onlyInStock || item.stock > 0;
      const itemCondition = item.condition === 'segunda_mano' ? 'segunda_mano' : 'nuevo';
      const matchesCondition = conditionFilter === 'all' || itemCondition === conditionFilter;

      return matchesSearch && matchesFilter && matchesMin && matchesMax && matchesStock && matchesCondition;
    });

    const sorted = [...result];
    if (sortBy === 'precio-asc') sorted.sort((a, b) => a.price - b.price);
    else if (sortBy === 'precio-desc') sorted.sort((a, b) => b.price - a.price);
    // 'recientes' conserva el orden de llegada (ya viene por created_at desc)
    return sorted;
  }, [products, searchTerm, selectedFilter, minPrice, maxPrice, onlyInStock, sortBy, conditionFilter]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-wider text-indigo-400">SCOTT GAMES</h1>
          <p className="text-slate-400 text-xs mt-1">Stock en vivo desde tienda física y web</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setTradeInOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 transition shadow-lg shadow-purple-900/30"
          >
            🔁 Trae tu usado
          </button>
          <OrderTracker />
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
            {slides.map((banner, i) => (
              <div
                key={i}
                className={`relative min-w-full h-48 md:h-60 px-8 md:px-14 flex flex-col justify-center overflow-hidden ${banner.image_url ? 'bg-slate-800' : `bg-gradient-to-r ${banner.gradient || 'from-indigo-600 via-purple-600 to-blue-700'}`}`}
                style={banner.image_url ? { backgroundImage: `url(${banner.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              >
                {banner.image_url && <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/20" />}
                <div className="relative z-10">
                  <h2 className="text-2xl md:text-4xl font-black text-white drop-shadow-lg">{banner.title}</h2>
                  <p className="text-white/90 text-sm md:text-base mt-2 max-w-xl">{banner.subtitle}</p>
                  {banner.href && banner.cta && (
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
            {slides.map((_, i) => (
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

        {/* Filtro rápido: Nuevo vs Segunda mano */}
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all', label: 'Todo' },
            { key: 'nuevo', label: '🟢 Nuevo' },
            { key: 'segunda_mano', label: '🟣 Seminuevo' },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setConditionFilter(opt.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${conditionFilter === opt.key ? 'bg-slate-100 text-slate-900 border-slate-100' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filtros avanzados */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-semibold">Precio S/.</span>
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Mín"
              className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <span className="text-slate-600 text-xs">—</span>
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Máx"
              className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyInStock}
              onChange={(e) => setOnlyInStock(e.target.checked)}
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="text-[11px] text-slate-400 font-semibold">Solo en stock</span>
          </label>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] text-slate-400 font-semibold">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="recientes">Más recientes</option>
              <option value="precio-asc">Precio: Menor a Mayor</option>
              <option value="precio-desc">Precio: Mayor a Menor</option>
            </select>
          </div>

          {(minPrice || maxPrice || onlyInStock || sortBy !== 'recientes') && (
            <button
              onClick={() => { setMinPrice(''); setMaxPrice(''); setOnlyInStock(false); setSortBy('recientes'); }}
              className="text-[11px] text-slate-500 hover:text-white underline"
            >
              Limpiar filtros
            </button>
          )}
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
                  <div className="relative w-full h-44 mb-4 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800/80">
                    <span className={`absolute top-2 left-2 z-10 text-[10px] font-bold px-2 py-0.5 rounded-full ${item.condition === 'segunda_mano' ? 'bg-purple-500 text-white' : 'bg-emerald-500 text-white'}`}>
                      {item.condition === 'segunda_mano' ? '🟣 Seminuevo' : '🟢 Nuevo'}
                    </span>
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
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => addItem(item)}
                        title="Agregar al carrito"
                        aria-label="Agregar al carrito"
                        className="p-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                      </button>
                      <button onClick={() => setSelectedProduct(item)} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition">
                        Separar ({item.min_reservation_pct}%)
                      </button>
                    </div>
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
          <p className="font-black tracking-wider text-slate-400">SCOTT GAMES</p>
          <p>© {new Date().getFullYear()} SCOTT GAMES. Todos los derechos reservados.</p>
          <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="text-[#4a94f5] hover:text-white transition">
            Facebook Oficial
          </a>
        </div>
      </footer>

      {selectedProduct && <ReservationModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
      {backorderProduct && <BackorderModal product={backorderProduct} onClose={() => setBackorderProduct(null)} />}

      {/* Carrito flotante y notificaciones de prueba social */}
      <CartDrawer />
      <SocialProofToasts />

      {tradeInOpen && <TradeInModal onClose={() => setTradeInOpen(false)} />}
    </main>
  );
}