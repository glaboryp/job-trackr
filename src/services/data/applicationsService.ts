import { readInsforgeConfig } from '../../config/insforge'
import { getInsforgeClient } from '../../lib/insforge/client'
import type { Application } from '../../types/application'
import type { RemoteApplicationRecord } from '../../types/remoteApplication'
import type { ReconcileRequest, ReconcileResult, ReconcileStrategy } from '../../types/sync'
import { toApplication, toRemoteRecord } from './applicationMapper'

type GenericObject = Record<string, unknown>

type TableQuery = {
  select: (...args: unknown[]) => TableQuery | Promise<unknown>
  order?: (...args: unknown[]) => TableQuery | Promise<unknown>
  eq?: (...args: unknown[]) => TableQuery | Promise<unknown>
  insert?: (...args: unknown[]) => Promise<unknown>
  upsert?: (...args: unknown[]) => Promise<unknown>
  update?: (...args: unknown[]) => TableQuery | Promise<unknown>
  delete?: (...args: unknown[]) => TableQuery | Promise<unknown>
}

function isObject(value: unknown): value is GenericObject {
  return typeof value === 'object' && value !== null
}

function extractResponseData<T>(response: unknown): T {
  if (isObject(response) && 'error' in response && response.error) {
    throw response.error
  }

  if (isObject(response) && 'data' in response) {
    return response.data as T
  }

  return response as T
}

function normalizeReconcileResult(payload: unknown): ReconcileResult {
  if (!isObject(payload)) {
    throw new Error('Formato inválido de respuesta de sincronización')
  }

  const created = Number(payload.created ?? 0)
  const updated = Number(payload.updated ?? 0)
  const deleted = Number(payload.deleted ?? 0)
  const skipped = Number(payload.skipped ?? 0)

  if (!Number.isInteger(created) || created < 0) {
    throw new Error('Conteo inválido de creados en sincronización')
  }
  if (!Number.isInteger(updated) || updated < 0) {
    throw new Error('Conteo inválido de actualizados en sincronización')
  }
  if (!Number.isInteger(deleted) || deleted < 0) {
    throw new Error('Conteo inválido de eliminados en sincronización')
  }
  if (!Number.isInteger(skipped) || skipped < 0) {
    throw new Error('Conteo inválido de omitidos en sincronización')
  }

  const dataApplications = payload.applications
  if (!Array.isArray(dataApplications)) {
    throw new Error('Formato inválido de aplicaciones en sincronización')
  }

  const normalizedApplications = dataApplications.map((record) => {
    if (!isObject(record)) {
      throw new Error('Registro de aplicación inválido en sincronización')
    }
    return toApplication(record as RemoteApplicationRecord)
  })

  return {
    created,
    updated,
    deleted,
    skipped,
    applications: normalizedApplications,
  }
}

function resolveTable(client: unknown): TableQuery {
  if (!isObject(client)) {
    throw new Error('InsForge client is not initialized correctly.')
  }

  const database = (client.database ?? client.db) as GenericObject | undefined
  if (!database || typeof database.from !== 'function') {
    throw new Error('InsForge database client is unavailable.')
  }

  const table = (database.from as (tableName: string) => unknown)('applications')

  if (!isObject(table) || typeof table.select !== 'function') {
    throw new Error('InsForge table interface is unavailable.')
  }

  return table as unknown as TableQuery
}

function extractTokenFromClient(client: unknown): string | null {
  if (!isObject(client)) {
    return null
  }

  const getHttpClient = (client as GenericObject).getHttpClient
  if (typeof getHttpClient !== 'function') {
    return null
  }

  const httpClient = getHttpClient.call(client)
  if (!isObject(httpClient) || typeof httpClient.getHeaders !== 'function') {
    return null
  }

  const headers = httpClient.getHeaders() as Record<string, string>
  const authorization = headers.Authorization ?? headers.authorization ?? ''
  if (authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim()
  }

  return null
}

function resolveFunctionsBaseUrl(baseUrl: string): string {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')

  if (normalizedBaseUrl.includes('.functions.insforge.app')) {
    return normalizedBaseUrl
  }

  const match = normalizedBaseUrl.match(/^https:\/\/([^.]+)(?:\.[^.]+)?\.insforge\.app$/)
  if (match) {
    return `https://${match[1]}.functions.insforge.app`
  }

  return `${normalizedBaseUrl}/rest/v1/functions`
}

async function resolveFunctionResponse(client: unknown, name: string, payload: unknown, idempotencyKey: string): Promise<unknown> {
  if (!isObject(client)) {
    throw new Error('InsForge client is not initialized correctly.')
  }

  // Get the auth token from the client
  const token = extractTokenFromClient(client)
  if (!token) {
    throw new Error('No authentication token available. Please log in first.')
  }

  const config = readInsforgeConfig({ strict: true })
  const baseUrl = config.baseUrl.replace(/\/$/, '')
  const functionsBaseUrl = resolveFunctionsBaseUrl(baseUrl)
  const candidateUrls = [
    `${functionsBaseUrl}/${name}`,
  ]

  if (functionsBaseUrl.endsWith('/rest/v1/functions')) {
    candidateUrls.push(`${baseUrl.replace(/\/$/, '')}/rest/v1/functions/${name}`)
  }

  let lastError: Error | null = null

  for (const functionUrl of candidateUrls) {

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-insforge-base-url': baseUrl,
        'x-idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    const maxResponseSize = 10 * 1024 * 1024
    const contentType = response.headers.get('content-type') ?? ''

    if (responseText.length > maxResponseSize) {
      throw new Error('La respuesta del servidor es demasiado grande')
    }

    if (!response.ok) {
      lastError = new Error(`Function call failed with status ${response.status}`)

      if (response.status === 404) {
        continue
      }

      throw new Error(responseText || `Function call failed with status ${response.status}`)
    }

    if (!contentType.includes('application/json')) {
      throw new Error(`Unexpected non-JSON response from function: ${responseText.slice(0, 300)}`)
    }

    try {
      return JSON.parse(responseText)
    } catch (error) {
      throw new Error('La respuesta del servidor no es JSON válido')
    }
  }

  throw lastError ?? new Error('Function endpoint not found.')
}

function buildIdempotencyKey(strategy: ReconcileStrategy): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return `${strategy}-${globalThis.crypto.randomUUID()}`
  }

  return `${strategy}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export type ApplicationsService = {
  listRemoteApplications: () => Promise<Application[]>
  upsertRemoteApplication: (application: Application) => Promise<Application>
  deleteRemoteApplication: (id: string) => Promise<void>
  reconcileApplications: (request: Omit<ReconcileRequest, 'idempotencyKey'>) => Promise<ReconcileResult>
}

export function createApplicationsService(): ApplicationsService {
  return {
    async listRemoteApplications() {
      const client = await getInsforgeClient()
      const table = resolveTable(client)

      try {
        let queryResult = await Promise.resolve(table.select('*'))
        if (isObject(queryResult) && typeof queryResult.order === 'function') {
          queryResult = await Promise.resolve((queryResult.order as (...args: unknown[]) => unknown)('updated_at', { ascending: false }))
        }

        const records = extractResponseData<RemoteApplicationRecord[]>(queryResult)
        if (!Array.isArray(records)) {
          return []
        }

        return records.map(toApplication)
      } catch (err) {
        console.error('[listRemoteApplications] error:', err)
        throw err
      }
    },

    async upsertRemoteApplication(application) {
      const client = await getInsforgeClient()
      const table = resolveTable(client)
      const payload = toRemoteRecord(application)

      if (typeof table.upsert === 'function') {
        const response = await Promise.resolve(table.upsert(payload))
        const records = extractResponseData<RemoteApplicationRecord[] | RemoteApplicationRecord>(response)

        if (Array.isArray(records) && records[0]) {
          return toApplication(records[0])
        }

        if (isObject(records)) {
          return toApplication(records as RemoteApplicationRecord)
        }
      }

      if (typeof table.insert === 'function') {
        const response = await Promise.resolve(table.insert(payload))
        extractResponseData<unknown>(response)
      }

      return application
    },

    async deleteRemoteApplication(id) {
      if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9\-_]+$/.test(id)) {
        throw new Error('Formato de ID de aplicación no válido')
      }

      const config = readInsforgeConfig({ strict: true })
      const baseUrl = config.baseUrl.replace(/\/$/, '')
      const client = await getInsforgeClient()
      const token = extractTokenFromClient(client)
      
      if (!token) {
        throw new Error('No authentication token available. Cannot delete remote application.')
      }

      const params = new URLSearchParams()
      params.set('id', `eq.${id}`)
      const deleteUrl = `${baseUrl}/api/database/records/applications?${params.toString()}`
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Error al eliminar la aplicación: ${response.status}`)
      }
    },

    async reconcileApplications(request) {
      const idempotencyKey = buildIdempotencyKey(request.strategy)
      const client = await getInsforgeClient()

      const localApplications = request.localApplications
      
      const response = await resolveFunctionResponse(
        client,
        'reconcile-applications',
        {
          strategy: request.strategy,
          local_applications: localApplications,
        },
        idempotencyKey,
      )

      const payload = extractResponseData<unknown>(response)

      return normalizeReconcileResult(payload)
    },
  }
}

export const applicationsService = createApplicationsService()
