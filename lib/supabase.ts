import { createClient, type User } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error('Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY (veja .env.example).');
}

/**
 * Cliente do navegador. Usa só a chave publicável: todo acesso a dados passa pelo RLS do banco,
 * com o JWT do usuário logado. Nenhuma chave secreta existe no front.
 */
export const supabase = createClient<Database>(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

// Usuário atual em cache síncrono (para logs e campos como deleted_by).
let cachedUser: User | null = null;
supabase.auth.getSession().then(({ data }) => {
  cachedUser = data.session?.user ?? null;
});
supabase.auth.onAuthStateChange((_event, session) => {
  cachedUser = session?.user ?? null;
});

export const getCachedUser = (): User | null => cachedUser;

/** Token de acesso atual para chamar a API do próprio servidor (/api/*). */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
