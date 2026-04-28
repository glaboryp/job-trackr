import { describe, expect, it } from 'vitest'

import { InsforgeConfigError, isInsforgeConfigured, readInsforgeConfig } from '../config/insforge'

describe('InsForge config contract', () => {
  it('fails fast in strict mode when auth is enabled and required vars are missing', () => {
    expect(() => {
      readInsforgeConfig({
        strict: true,
        source: {
          VITE_INSFORGE_AUTH_ENABLED: 'true',
          VITE_INSFORGE_URL: '',
          VITE_INSFORGE_ANON_KEY: '',
        },
      })
    }).toThrowError(InsforgeConfigError)
  })

  it('allows missing vars when auth is explicitly disabled', () => {
    const config = readInsforgeConfig({
      strict: true,
      source: {
        VITE_INSFORGE_AUTH_ENABLED: 'false',
      },
    })

    expect(config.authEnabled).toBe(false)
    expect(config.baseUrl).toBe('')
    expect(config.anonKey).toBe('')
    expect(isInsforgeConfigured({ VITE_INSFORGE_AUTH_ENABLED: 'false' })).toBe(false)
  })

  it('returns valid config when all required values are present', () => {
    const config = readInsforgeConfig({
      strict: true,
      source: {
        VITE_INSFORGE_AUTH_ENABLED: 'true',
        VITE_INSFORGE_URL: 'https://example.insforge.app',
        VITE_INSFORGE_ANON_KEY: 'public-key',
      },
    })

    expect(config.authEnabled).toBe(true)
    expect(config.baseUrl).toBe('https://example.insforge.app')
    expect(config.anonKey).toBe('public-key')
    expect(
      isInsforgeConfigured({
        VITE_INSFORGE_AUTH_ENABLED: 'true',
        VITE_INSFORGE_URL: 'https://example.insforge.app',
        VITE_INSFORGE_ANON_KEY: 'public-key',
      }),
    ).toBe(true)
  })
})
