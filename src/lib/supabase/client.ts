import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { readSupabaseConfig } from '../../config/supabase'

let cachedClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient
  const config = readSupabaseConfig({ strict: true })
  cachedClient = createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
  return cachedClient
}

export function resetSupabaseClientCache(): void {
  cachedClient = null
}
