import StoreClient from './StoreClient';

// Evita el caché estático: la tienda siempre muestra los datos vivos de Supabase.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function Page() {
    return <StoreClient />;
}
