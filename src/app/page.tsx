'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Product, Banner } from '@/types/database';
import { useCart } from '@/context/CartContext';
import ReservationModal from '@/components/ReservationModal';
import BackorderModal from '@/components/BackorderModal';
import CartDrawer from '@/components/CartDrawer';
import SocialProofToasts from '@/components/SocialProofToasts';
import OrderTracker from '@/components/OrderTracker';
import TradeInModal from '@/components/TradeInModal';
import ProductCard from '@/components/ProductCard';
import ProductQuickView from '@/components/ProductQuickView';

type SortOption = 'recientes' | 'precio-asc' | 'precio-desc';

const FACEBOOK_URL = 'https://www.facebook.com/share/1BrzFx93Wa/?mibextid=wwXIfr';

type Slide = {
  title: string;
  subtitle: string;
  gradient?: string;
  image_url?: string | null;
  cta?: string;
  href?: string;
};

const DEFAULT_SLIDES: Slide[] = [
  { title: '¡Nuevos ingresos PS5!', subtitle: 'Marvel’s Spider-Man 2 y más lanzamientos ya en stock físico.', gradient: 'from-[#3e1b75] via-[#6d28d9] to-[#2563eb]', image_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2651280/library_hero.jpg' },
  { title: 'Preventas exclusivas', subtitle: 'Asegura tu juego con solo 20% y recógelo el día de estreno.', gradient: 'from-[#7c1d6f] via-[#8b5cf6] to-[#4c1d95]', image_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1245620/library_hero.jpg' },
  { title: 'Ofertas gamer imperdibles', subtitle: 'Los mejores títulos con descuentos y garantía de tienda.', gradient: 'from-[#1d4ed8] via-[#0e7490] to-[#2dd4bf]', image_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/271590/library_hero.jpg', cta: 'Ver ofertas', href: FACEBOOK_URL },
];

interface CategoryDef { key: string; label: string; icon: string; match: (p: Product) => boolean; }
const catText = (p: Product) => `${p.platform ?? ''} ${p.category} ${p.name}`.toLowerCase();
const CATEGORIES: CategoryDef[] = [
  { key: 'todos', label: 'Todos', icon: '🎮', match: () => true },
  { key: 'ps', label: 'PS5 / PS4', icon: '🟦', match: (p) => /playstation|ps5|ps4|ps3/.test(catText(p)) },
  { key: 'switch', label: 'Switch', icon: '🟥', match: (p) => /switch|nintendo/.test(catText(p)) },
  { key: 'xbox', label: 'Xbox', icon: '🟩', match: (p) => /xbox/.test(catText(p)) },
  { key: 'consolas', label: 'Consolas & Accesorios', icon: '🕹️', match: (p) => /consola|accesori|mando|control|auricular|audíf/.test(`${p.category} ${p.name}`.toLowerCase()) },
  { key: 'coleccionables', label: 'Coleccionables', icon: '🧸', match: (p) => /anime|colec|figura|funko|peluche/.test(`${p.category} ${p.name}`.toLowerCase()) },
  { key: 'seminuevos', label: 'Seminuevos', icon: '🏷️', match: (p) => p.condition === 'segunda_mano' },
];

const GENRES = ['Acción', 'Aventura', 'RPG', 'Carreras', 'Deportes', 'Indie'];

function pad(n: number) { return String(n).padStart(2, '0'); }

export default function Home() {
  const { count, openCart } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryKey, setCategoryKey] = useState('todos');
  const [genre, setGenre] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recientes');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [backorderProduct, setBackorderProduct] = useState<Product | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [tradeInOpen, setTradeInOpen] = useState(false);

  const [slide, setSlide] = useState(0);
  const [slides, setSlides] = useState<Slide[]>(DEFAULT_SLIDES);
  const [now, setNow] = useState(() => Date.now());
  const searchRef = useRef<HTMLInputElement>(null);

  // Oferta que termina al final del día (para la cuenta regresiva del hero).
  const offerEnd = useMemo(() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); }, []);
  const remaining = Math.max(0, offerEnd - now);
  const cH = Math.floor(remaining / 3600000);
  const cM = Math.floor((remaining % 3600000) / 60000);
  const cS = Math.floor((remaining % 60000) / 1000);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Atajo Ctrl/Cmd+K para enfocar la búsqueda.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const nextSlide = () => setSlide((s) => (s + 1) % slides.length);
  const prevSlide = () => setSlide((s) => (s - 1 + slides.length) % slides.length);

  // Banners activos desde Supabase (realtime), con respaldo local.
  useEffect(() => {
    const loadBanners = async () => {
      const { data } = await supabase.from('banners').select('*').eq('is_active', true).order('order_index', { ascending: true });
      if (data && data.length > 0) {
        setSlides((data as Banner[]).map((b) => ({ title: b.title, subtitle: b.subtitle ?? '', image_url: b.image_url, cta: b.button_text ?? undefined, href: b.link_url ?? undefined })));
      } else {
        setSlides(DEFAULT_SLIDES);
      }
      setSlide(0);
    };
    loadBanners();
    const channel = supabase.channel('banners-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => loadBanners()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(timer);
  }, [slide, slides.length]);

  // Catálogo (realtime).
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
        if (payload.eventType === 'INSERT') setProducts((prev) => [payload.new as Product, ...prev]);
        else if (payload.eventType === 'UPDATE') setProducts((prev) => prev.map((p) => (p.id === payload.new.id ? (payload.new as Product) : p)));
        else if (payload.eventType === 'DELETE') setProducts((prev) => prev.filter((p) => p.id === payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredProducts = useMemo(() => {
    const activeCat = CATEGORIES.find((c) => c.key === categoryKey) || CATEGORIES[0];
    const min = minPrice.trim() !== '' ? Number(minPrice) : null;
    const max = maxPrice.trim() !== '' ? Number(maxPrice) : null;
    const q = searchTerm.toLowerCase();
    const g = genre.toLowerCase();

    const result = products.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(q) || (item.description ?? '').toLowerCase().includes(q);
      const matchesCat = activeCat.match(item);
      const matchesGenre = g === '' || `${item.name} ${item.description ?? ''} ${item.category}`.toLowerCase().includes(g);
      const matchesMin = min === null || item.price >= min;
      const matchesMax = max === null || item.price <= max;
      const matchesStock = !onlyInStock || item.stock > 0;
      return matchesSearch && matchesCat && matchesGenre && matchesMin && matchesMax && matchesStock;
    });

    const sorted = [...result];
    if (sortBy === 'precio-asc') sorted.sort((a, b) => a.price - b.price);
    else if (sortBy === 'precio-desc') sorted.sort((a, b) => b.price - a.price);
    return sorted;
  }, [products, searchTerm, categoryKey, genre, minPrice, maxPrice, onlyInStock, sortBy]);

  const current = slides[slide] ?? slides[0];

  return (
    <main className="min-h-screen bg-[#13072b] text-slate-100">
      {/* TopBar */}
      <div className="bg-[#0d0520] border-b border-[#3e1b75]/60 text-[11px]">
        <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center justify-between gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[#2dd4bf] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2dd4bf] animate-pulse" /> Tienda física Lima: Stock en Vivo
          </span>
          <div className="flex items-center gap-4">
            <OrderTracker />
            <button onClick={() => setTradeInOpen(true)} className="text-xs font-semibold text-[#c4b5fd] hover:text-white transition">🔄 Cotizar Trueque</button>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-30 bg-[#13072b]/95 backdrop-blur border-b border-[#3e1b75]/60">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="#" className="flex items-center gap-2 shrink-0 group">
            {/* Isotipo gamer: escudo con mando y resplandor neón */}
            <span className="relative inline-flex" style={{ filter: 'drop-shadow(0 0 6px rgba(139,92,246,0.7))' }}>
              <svg viewBox="0 0 48 48" className="w-8 h-8" aria-hidden="true">
                <defs>
                  <linearGradient id="scottLogo" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#8b5cf6" />
                    <stop offset="1" stopColor="#2dd4bf" />
                  </linearGradient>
                </defs>
                {/* Escudo */}
                <path d="M24 3l16 5v12c0 10-6.8 17.6-16 21-9.2-3.4-16-11-16-21V8l16-5z" fill="#1e0d3b" stroke="url(#scottLogo)" strokeWidth="2.5" strokeLinejoin="round" />
                {/* Mando */}
                <g fill="#fcd34d">
                  <rect x="13" y="21" width="22" height="10" rx="5" />
                  <circle cx="16.5" cy="26" r="1.6" fill="#1e0d3b" />
                  <rect x="20.2" y="25.2" width="1.6" height="1.6" fill="#1e0d3b" />
                  <circle cx="31.5" cy="26" r="1.4" fill="#1e0d3b" />
                </g>
              </svg>
            </span>
            <span className="text-xl font-black tracking-wider text-white">SCOTT <span className="text-[#fcd34d]">GAMES</span></span>
          </a>
          <div className="relative flex-1 max-w-xl mx-auto">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a72b8]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </span>
            <input
              ref={searchRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Busca juegos, consolas, accesorios..."
              className="w-full bg-[#2a1352] border border-[#3e1b75] rounded-xl pl-9 pr-16 py-2.5 text-sm text-white placeholder-[#8a72b8] focus:outline-none focus:border-[#8b5cf6]"
            />
            <span className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center gap-1 text-[10px] text-[#8a72b8] border border-[#3e1b75] rounded px-1.5 py-0.5">Ctrl K</span>
          </div>
          <button onClick={openCart} className="relative shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-zinc-950 bg-[#fcd34d] hover:bg-[#fbbf24] transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
            <span className="hidden sm:inline">Carrito</span>
            {count > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-[#8b5cf6] text-white text-[11px] font-black flex items-center justify-center border-2 border-[#13072b]">{count}</span>}
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Hero grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Banner principal (carrusel) */}
          <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-[#3e1b75] min-h-[240px] flex">
            <div className="flex w-full transition-transform duration-700 ease-out" style={{ transform: `translateX(-${slide * 100}%)` }}>
              {slides.map((b, i) => (
                <div key={i} className={`relative min-w-full p-6 md:p-8 flex flex-col justify-center bg-gradient-to-br ${b.gradient || 'from-[#3e1b75] to-[#6d28d9]'}`}>
                  {/* Imagen real de fondo (con degradé para alto contraste); cae al gradiente si falla */}
                  {b.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.image_url} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  {b.image_url && <div className="absolute inset-0 bg-gradient-to-r from-[#13072b]/95 via-[#13072b]/80 to-transparent" />}
                  <div className="relative z-10 max-w-md">
                    <span className="inline-block text-[11px] font-black px-2 py-0.5 rounded bg-[#fcd34d] text-zinc-950 mb-3">🔥 OFERTA · termina en {pad(cH)}:{pad(cM)}:{pad(cS)}</span>
                    <h2 className="text-2xl md:text-4xl font-black text-white drop-shadow">{b.title}</h2>
                    <p className="text-white/85 text-sm mt-2">{b.subtitle}</p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <a href="#catalogo" className="px-4 py-2 rounded-lg text-xs font-black bg-[#fcd34d] text-zinc-950 hover:bg-[#fbbf24] transition">Reservar Preventa</a>
                      {b.href ? (
                        <a href={b.href} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#8b5cf6]/80 hover:bg-[#8b5cf6] transition">{b.cta || 'Ver más'}</a>
                      ) : (
                        <a href="#catalogo" className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#8b5cf6]/80 hover:bg-[#8b5cf6] transition">Ver Ofertas</a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={prevSlide} aria-label="Anterior" className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white z-10">‹</button>
            <button onClick={nextSlide} aria-label="Siguiente" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white z-10">›</button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setSlide(i)} aria-label={`Banner ${i + 1}`} className={`h-2 rounded-full transition-all ${i === slide ? 'w-5 bg-[#fcd34d]' : 'w-2 bg-white/40'}`} />
              ))}
            </div>
          </div>

          {/* Mini banners */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <button onClick={() => setTradeInOpen(true)} className="group relative overflow-hidden text-left rounded-2xl border border-[#3e1b75] bg-gradient-to-br from-[#2a1352] to-[#3e1b75] p-4 hover:border-[#8b5cf6] transition">
              {/* Watermark de mandos/consolas + overlay violeta oscuro */}
              <span className="pointer-events-none absolute -right-3 -bottom-4 text-[80px] leading-none opacity-15 group-hover:opacity-25 group-hover:scale-110 transition duration-500">🎮</span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#1e0d3b]/90 via-[#2a1352]/70 to-transparent" />
              <div className="relative z-10">
                <p className="text-[11px] font-black text-[#2dd4bf] uppercase tracking-wide">🔄 Plan Canje / Trueque</p>
                <p className="text-sm font-bold text-white mt-1">Deja tu disco usado como parte de pago</p>
                <p className="text-[11px] text-[#c4b5fd] mt-1">Trae tu juego o consola y paga solo la diferencia →</p>
              </div>
            </button>
            <a href="#catalogo" className="group relative overflow-hidden block rounded-2xl border border-[#3e1b75] bg-gradient-to-br from-[#0e7490]/50 to-[#2a1352] p-4 hover:border-[#2dd4bf] transition">
              {/* Watermark de entrega rápida + overlay */}
              <span className="pointer-events-none absolute -right-3 -bottom-4 text-[80px] leading-none opacity-15 group-hover:opacity-25 group-hover:scale-110 transition duration-500">🚚</span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#0d0520]/90 via-[#0e7490]/20 to-transparent" />
              <div className="relative z-10">
                <p className="text-[11px] font-black text-[#fcd34d] uppercase tracking-wide">📦 Envío Gratis a todo el Perú</p>
                <p className="text-sm font-bold text-white mt-1">Por compras desde S/. 300</p>
                <p className="text-[11px] text-[#c4b5fd] mt-1">Agrega productos y llega gratis a tu puerta →</p>
              </div>
            </a>
          </div>
        </section>

        {/* Cinta de categorías */}
        <section className="-mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategoryKey(c.key)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition ${categoryKey === c.key ? 'bg-[#fcd34d] text-zinc-950 border-[#fcd34d]' : 'bg-[#2a1352] text-[#c4b5fd] border-[#3e1b75] hover:border-[#8b5cf6]'}`}
              >
                <span>{c.icon}</span> {c.label}
              </button>
            ))}
          </div>
        </section>

        {/* Grilla de géneros */}
        <section>
          <p className="text-[11px] font-black uppercase tracking-wider text-[#8a72b8] mb-2">Explora por género</p>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((gname) => (
              <button
                key={gname}
                onClick={() => setGenre((g) => (g === gname ? '' : gname))}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${genre === gname ? 'bg-[#8b5cf6] text-white border-[#8b5cf6]' : 'bg-[#2a1352] text-[#c4b5fd] border-[#3e1b75] hover:border-[#8b5cf6]'}`}
              >
                {gname}
              </button>
            ))}
            {(genre || categoryKey !== 'todos' || searchTerm || minPrice || maxPrice || onlyInStock || sortBy !== 'recientes') && (
              <button onClick={() => { setGenre(''); setCategoryKey('todos'); setSearchTerm(''); setMinPrice(''); setMaxPrice(''); setOnlyInStock(false); setSortBy('recientes'); }} className="px-3 py-1.5 rounded-full text-xs font-bold text-[#8a72b8] hover:text-white underline">
                Limpiar
              </button>
            )}
          </div>
        </section>

        {/* Filtros compactos + contador */}
        <section className="flex flex-wrap items-center gap-3 bg-[#2a1352] border border-[#3e1b75] rounded-xl p-3">
          <span className="text-xs font-bold text-white">{filteredProducts.length} resultados</span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#8a72b8] font-semibold">Precio</span>
            <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Mín" className="w-16 bg-[#13072b] border border-[#3e1b75] rounded-lg px-2 py-1.5 text-xs text-white placeholder-[#6d4aa8] focus:outline-none focus:border-[#8b5cf6]" />
            <span className="text-[#6d4aa8] text-xs">—</span>
            <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Máx" className="w-16 bg-[#13072b] border border-[#3e1b75] rounded-lg px-2 py-1.5 text-xs text-white placeholder-[#6d4aa8] focus:outline-none focus:border-[#8b5cf6]" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={onlyInStock} onChange={(e) => setOnlyInStock(e.target.checked)} className="w-4 h-4 accent-[#8b5cf6]" />
            <span className="text-[11px] text-[#c4b5fd] font-semibold">Solo en stock</span>
          </label>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] text-[#8a72b8] font-semibold">Ordenar</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="bg-[#13072b] border border-[#3e1b75] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#8b5cf6]">
              <option value="recientes">Más recientes</option>
              <option value="precio-asc">Precio: Menor a Mayor</option>
              <option value="precio-desc">Precio: Mayor a Menor</option>
            </select>
          </div>
        </section>

        {/* Grilla de productos */}
        <section id="catalogo" className="scroll-mt-20">
          {loading ? (
            <p className="text-center text-[#8a72b8] py-10">Cargando catálogo...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-center text-[#8a72b8] py-10">No se encontraron productos con esos criterios.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map((item) => (
                <ProductCard key={item.id} product={item} onReserve={setSelectedProduct} onBackorder={setBackorderProduct} onQuickView={setQuickViewProduct} />
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-10 pt-8 border-t border-[#3e1b75]/60">
          <div className="rounded-2xl border border-[#3e1b75] bg-gradient-to-r from-[#2a1352] to-[#3e1b75] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-black text-white">¡Únete a la comunidad SCOTT GAMES!</h3>
              <p className="text-sm text-[#c4b5fd] mt-1">Ofertas, sorteos y novedades primero en nuestro Facebook.</p>
            </div>
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-[#1877F2] hover:bg-[#0f66d0] transition whitespace-nowrap">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true"><path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.313 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" /></svg>
              Síguenos en Facebook
            </a>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-6 text-xs text-[#8a72b8]">
            <p className="font-black tracking-wider text-[#c4b5fd]">SCOTT GAMES</p>
            <p>© {new Date().getFullYear()} SCOTT GAMES · Lima, Perú. Todos los derechos reservados.</p>
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="text-[#2dd4bf] hover:text-white transition">Facebook Oficial</a>
          </div>
        </footer>
      </div>

      {/* Modales y utilidades */}
      {quickViewProduct && (
        <ProductQuickView product={quickViewProduct} onClose={() => setQuickViewProduct(null)} onReserve={setSelectedProduct} onBackorder={setBackorderProduct} />
      )}
      {selectedProduct && <ReservationModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />}
      {backorderProduct && <BackorderModal product={backorderProduct} onClose={() => setBackorderProduct(null)} />}
      {tradeInOpen && <TradeInModal onClose={() => setTradeInOpen(false)} />}

      <CartDrawer />
      <SocialProofToasts />
    </main>
  );
}
