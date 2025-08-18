import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Brak konfiguracji Supabase. Sprawdź zmienne środowiskowe.')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
