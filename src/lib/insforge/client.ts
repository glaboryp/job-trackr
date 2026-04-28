import { readInsforgeConfig } from '../../config/insforge'

type InsforgeSdkModule = {
  createClient?: (options: { baseUrl: string; anonKey: string }) => unknown
}

let cachedClient: unknown | null = null

export async function getInsforgeClient(): Promise<unknown> {
  if (cachedClient) {
    return cachedClient
  }

  const config = readInsforgeConfig({ strict: true })
  const sdkModule = (await import('@insforge/sdk')) as InsforgeSdkModule
  const createClient = sdkModule.createClient

  if (typeof createClient !== 'function') {
    throw new Error('InsForge SDK does not expose createClient()')
  }

  cachedClient = createClient({
    baseUrl: config.baseUrl,
    anonKey: config.anonKey,
  })

  return cachedClient
}

export function resetInsforgeClientCache(): void {
  cachedClient = null
}
