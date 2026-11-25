type EnvSource = Record<string, unknown>

const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on'])

export type SupabaseClientConfig = {
  url: string
  publishableKey: string
  authEnabled: boolean
}

export class SupabaseConfigError extends Error {
  readonly missingKeys: string[]

  constructor(missingKeys: string[]) {
    super(`Missing required Supabase environment variables: ${missingKeys.join(', ')}`)
    this.name = 'SupabaseConfigError'
    this.missingKeys = missingKeys
  }
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function readSupabaseConfig(options: { strict?: boolean; source?: EnvSource } = {}): SupabaseClientConfig {
  const source = options.source ?? (import.meta.env as unknown as EnvSource)
  const strict = options.strict ?? true
  const url = readString(source.VITE_SUPABASE_URL)
  const publishableKey = readString(source.VITE_SUPABASE_PUBLISHABLE_KEY ?? source.VITE_SUPABASE_ANON_KEY)
  const authValue = readString(source.VITE_SUPABASE_AUTH_ENABLED)
  const authEnabled = authValue ? ENABLED_VALUES.has(authValue.toLowerCase()) : true

  if (strict && authEnabled) {
    const missingKeys: string[] = []
    if (!url) missingKeys.push('VITE_SUPABASE_URL')
    else {
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) {
          throw new Error('VITE_SUPABASE_URL debe ser una URL HTTPS de Supabase')
        }
      } catch (error) {
        if (error instanceof TypeError) throw new Error('VITE_SUPABASE_URL no es una URL válida')
        throw error
      }
    }
    if (!publishableKey) missingKeys.push('VITE_SUPABASE_PUBLISHABLE_KEY')
    if (missingKeys.length) throw new SupabaseConfigError(missingKeys)
  }

  return { url, publishableKey, authEnabled }
}

export function isSupabaseConfigured(source?: EnvSource): boolean {
  const config = readSupabaseConfig({ strict: false, source })
  return config.authEnabled && Boolean(config.url) && Boolean(config.publishableKey)
}
