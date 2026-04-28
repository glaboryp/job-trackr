import { computed, ref } from 'vue'

import { applicationsService } from '../services/data/applicationsService'
import type { Application } from '../types/application'
import type { ApplicationStatus } from '../constants/statuses'
import type { ReconcileResult, ReconcileStrategy } from '../types/sync'
import { useApplications, type NewApplicationInput, type UpdateApplicationInput } from './useApplications'

type DataSource = 'local' | 'remote'

function normalizeError(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error.trim()) {
    return error.trim()
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

export function useUnifiedApplications(storageKey?: string) {
  const localStore = useApplications(storageKey)
  const source = ref<DataSource>('local')
  const remoteApplications = ref<Application[]>([])
  const remoteError = ref<string | null>(null)
  const isSyncing = ref(false)

  const applications = computed<readonly Application[]>(() => {
    if (source.value === 'remote') {
      return remoteApplications.value
    }

    return localStore.applications.value
  })

  function mirrorToLocal(nextApplications: Application[]): void {
    localStore.replaceApplications(nextApplications)
  }

  function setRemoteSnapshot(apps: Application[], options: { mirrorLocal?: boolean } = {}): void {
    remoteApplications.value = [...apps]

    if (options.mirrorLocal) {
      mirrorToLocal(apps)
    }
  }

  function activateAnonymous(): void {
    source.value = 'local'
    remoteError.value = null
  }

  async function activateRemote(): Promise<void> {
    isSyncing.value = true

    try {
      const fetched = await applicationsService.listRemoteApplications()
      setRemoteSnapshot(fetched, { mirrorLocal: true })
      source.value = 'remote'
      remoteError.value = null
    } catch (error) {
      source.value = 'local'
      remoteError.value = normalizeError(error, 'No se pudo sincronizar con el servidor. Continuas en modo local.')
    } finally {
      isSyncing.value = false
    }
  }

  function handleRemoteFailure(error: unknown): void {
    source.value = 'local'
    remoteError.value = normalizeError(error, 'Se perdió conexión con el servidor. Tus cambios siguen en local.')
  }

  async function createApplication(input: NewApplicationInput): Promise<Application> {
    const created = localStore.createApplication(input)

    if (source.value === 'remote') {
      remoteApplications.value = [...localStore.applications.value]

      try {
        await applicationsService.upsertRemoteApplication(created)
        await activateRemote()
      } catch (error) {
        handleRemoteFailure(error)
      }
    }

    return created
  }

  async function updateApplication(id: string, updates: UpdateApplicationInput): Promise<Application | null> {
    const updated = localStore.updateApplication(id, updates)
    if (!updated) {
      return null
    }

    if (source.value === 'remote') {
      remoteApplications.value = [...localStore.applications.value]

      try {
        await applicationsService.upsertRemoteApplication(updated)
        await activateRemote()
      } catch (error) {
        handleRemoteFailure(error)
      }
    }

    return updated
  }

  async function deleteApplication(id: string): Promise<boolean> {
    const wasDeleted = localStore.deleteApplication(id)
    if (!wasDeleted) {
      return false
    }

    if (source.value === 'remote') {
      remoteApplications.value = [...localStore.applications.value]

      try {
        await applicationsService.deleteRemoteApplication(id)
        await activateRemote()
      } catch (error) {
        handleRemoteFailure(error)
      }
    }

    return true
  }

  async function moveApplication(
    id: string,
    nextStatus: ApplicationStatus,
    nextIndex: number,
  ): Promise<Application | null> {
    const moved = localStore.moveApplication(id, nextStatus, nextIndex)
    if (!moved) {
      return null
    }

    if (source.value === 'remote') {
      remoteApplications.value = [...localStore.applications.value]

      try {
        await applicationsService.upsertRemoteApplication(moved)
        await activateRemote()
      } catch (error) {
        handleRemoteFailure(error)
      }
    }

    return moved
  }

  async function reconcile(strategy: ReconcileStrategy): Promise<ReconcileResult> {
    isSyncing.value = true

    try {
      const result = await applicationsService.reconcileApplications({
        strategy,
        localApplications: [...localStore.applications.value],
      })

      setRemoteSnapshot(result.applications, { mirrorLocal: true })
      source.value = 'remote'
      remoteError.value = null
      return result
    } catch (error) {
      handleRemoteFailure(error)
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  return {
    source,
    applications,
    remoteError,
    isSyncing,
    hasLocalData: computed(() => localStore.applications.value.length > 0),
    hasRemoteData: computed(() => remoteApplications.value.length > 0),
    localSnapshot: computed(() => [...localStore.applications.value]),
    replaceLocalSnapshot: mirrorToLocal,
    activateAnonymous,
    activateRemote,
    setRemoteSnapshot,
    createApplication,
    updateApplication,
    deleteApplication,
    moveApplication,
    reconcile,
  }
}
