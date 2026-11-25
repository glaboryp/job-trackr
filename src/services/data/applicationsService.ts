import { getSupabaseClient } from '../../lib/supabase/client'
import type { Application } from '../../types/application'
import type { RemoteApplicationRecord } from '../../types/remoteApplication'
import type { ReconcileRequest, ReconcileResult, ReconcileStrategy } from '../../types/sync'
import { toApplication, toRemoteRecord } from './applicationMapper'

function buildIdempotencyKey(strategy: ReconcileStrategy): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return `${strategy}-${globalThis.crypto.randomUUID()}`
  return `${strategy}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeReconcileResult(payload: unknown): ReconcileResult {
  if (!payload || typeof payload !== 'object') throw new Error('Respuesta de reconciliación inválida')
  const result = payload as Record<string, unknown>
  const applications = result.applications
  if (!Array.isArray(applications)) throw new Error('Respuesta de reconciliación sin candidaturas')
  return {
    created: Number(result.created ?? 0),
    updated: Number(result.updated ?? 0),
    deleted: Number(result.deleted ?? 0),
    skipped: Number(result.skipped ?? 0),
    applications: applications.map((record) => toApplication(record as RemoteApplicationRecord)),
  }
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
      const client = getSupabaseClient()
      const { error: claimError } = await client.rpc('claim_legacy_applications')
      if (claimError) throw claimError
      const { data, error } = await client
        .from('applications')
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((record) => toApplication(record as RemoteApplicationRecord))
    },

    async upsertRemoteApplication(application) {
      const client = getSupabaseClient()
      const { data: userData, error: userError } = await client.auth.getUser()
      if (userError) throw userError
      if (!userData.user) throw new Error('Inicia sesión antes de guardar candidaturas en Supabase.')

      const { data, error } = await client
        .from('applications')
        .upsert({ ...toRemoteRecord(application), user_id: userData.user.id }, { onConflict: 'id' })
        .select('*')
        .single()
      if (error) throw error
      return toApplication(data as RemoteApplicationRecord)
    },

    async deleteRemoteApplication(id) {
      if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9\-_]+$/.test(id)) {
        throw new Error('Formato de ID de aplicación no válido')
      }
      const { error } = await getSupabaseClient().from('applications').delete().eq('id', id)
      if (error) throw error
    },

    async reconcileApplications(request) {
      const { data, error } = await getSupabaseClient().rpc('reconcile_applications', {
        p_strategy: request.strategy,
        p_local_applications: request.localApplications.map(toRemoteRecord),
        p_idempotency_key: buildIdempotencyKey(request.strategy),
      })
      if (error) throw error
      return normalizeReconcileResult(data)
    },
  }
}

export const applicationsService = createApplicationsService()
