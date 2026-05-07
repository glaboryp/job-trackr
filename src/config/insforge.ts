type EnvSource = Record<string, unknown>

const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on'])

export type InsforgeClientConfig = {
  baseUrl: string
  anonKey: string
  authEnabled: boolean
}

export class InsforgeConfigError extends Error {
  readonly missingKeys: string[]

  constructor(missingKeys: string[]) {
    super(`Missing required InsForge environment variables: ${missingKeys.join(', ')}`)
    this.name = 'InsforgeConfigError'
    this.missingKeys = missingKeys
  }
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value !== 'string') {
    return fallback
  }

  return ENABLED_VALUES.has(value.trim().toLowerCase())
}

function readEnv(source: EnvSource, key: string): string {
  return toStringValue(source[key])
}

function validateBaseUrl(url: string): void {
  if (!url.startsWith('https://')) {
    throw new Error('VITE_INSFORGE_URL debe usar HTTPS')
  }

  if (!url.includes('.insforge.app')) {
    throw new Error('VITE_INSFORGE_URL debe ser un dominio de InsForge')
  }

  try {
    new URL(url)
  } catch {
    throw new Error('VITE_INSFORGE_URL no es una URL válida')
  }
}

export function readInsforgeConfig(options: { strict?: boolean; source?: EnvSource } = {}): InsforgeClientConfig {
  const source = options.source ?? (import.meta.env as unknown as EnvSource)
  const strict = options.strict ?? true

  const baseUrl = readEnv(source, 'VITE_INSFORGE_URL')
  const anonKey = readEnv(source, 'VITE_INSFORGE_ANON_KEY')
  const authEnabled = readBoolean(source.VITE_INSFORGE_AUTH_ENABLED, true)

  if (strict && authEnabled) {
    const missingKeys: string[] = []

    if (!baseUrl) {
      missingKeys.push('VITE_INSFORGE_URL')
    } else {
      validateBaseUrl(baseUrl)
    }

    if (!anonKey) {
      missingKeys.push('VITE_INSFORGE_ANON_KEY')
    }

    if (missingKeys.length > 0) {
      throw new InsforgeConfigError(missingKeys)
    }
  }

  return {
    baseUrl,
    anonKey,
    authEnabled,
  }
}

export function isInsforgeConfigured(source?: EnvSource): boolean {
  const config = readInsforgeConfig({ strict: false, source })
  return config.authEnabled && Boolean(config.baseUrl) && Boolean(config.anonKey)
}
