import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    // Falla claro en vez de crear un cliente con credenciales vacías que rompe en runtime sin pista.
    throw new Error(
        'Faltan variables de entorno de Supabase: define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);