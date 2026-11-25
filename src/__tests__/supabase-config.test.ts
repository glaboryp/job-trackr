import { describe, expect, it } from 'vitest'

import { isSupabaseConfigured, readSupabaseConfig, SupabaseConfigError } from '../config/supabase'

describe('Supabase config contract', () => {
  it('fails fast when auth is enabled and required variables are missing', () => {
    expect(() => readSupabaseConfig({ strict: true, source: {
      VITE_SUPABASE_AUTH_ENABLED: 'true',
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
    } })).toThrowError(SupabaseConfigError)
  })

  it('allows missing variables when auth is explicitly disabled', () => {
    const config = readSupabaseConfig({ strict: true, source: { VITE_SUPABASE_AUTH_ENABLED: 'false' } })
    expect(config.authEnabled).toBe(false)
    expect(config.url).toBe('')
    expect(config.publishableKey).toBe('')
    expect(isSupabaseConfigured({ VITE_SUPABASE_AUTH_ENABLED: 'false' })).toBe(false)
  })

  it('returns a valid Supabase config', () => {
    const source = {
      VITE_SUPABASE_AUTH_ENABLED: 'true',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    }
    const config = readSupabaseConfig({ strict: true, source })
    expect(config).toEqual({ authEnabled: true, url: source.VITE_SUPABASE_URL, publishableKey: source.VITE_SUPABASE_PUBLISHABLE_KEY })
    expect(isSupabaseConfigured(source)).toBe(true)
  })
})
