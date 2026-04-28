import { beforeEach, describe, expect, it, vi } from 'vitest'

const applicationsServiceMock = vi.hoisted(() => ({
  listRemoteApplications: vi.fn(),
  upsertRemoteApplication: vi.fn(),
  deleteRemoteApplication: vi.fn(),
  reconcileApplications: vi.fn(),
}))

vi.mock('../services/data/applicationsService', () => ({
  applicationsService: applicationsServiceMock,
  createApplicationsService: () => applicationsServiceMock,
}))

import { useUnifiedApplications } from '../composables/useUnifiedApplications'

describe('useUnifiedApplications', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()

    applicationsServiceMock.listRemoteApplications.mockReset()
    applicationsServiceMock.upsertRemoteApplication.mockReset()
    applicationsServiceMock.deleteRemoteApplication.mockReset()
    applicationsServiceMock.reconcileApplications.mockReset()

    applicationsServiceMock.listRemoteApplications.mockResolvedValue([])
    applicationsServiceMock.upsertRemoteApplication.mockResolvedValue(null)
    applicationsServiceMock.deleteRemoteApplication.mockResolvedValue(undefined)
    applicationsServiceMock.reconcileApplications.mockResolvedValue({
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      applications: [],
    })
  })

  it('keeps anonymous local mode fully functional', async () => {
    const store = useUnifiedApplications('useUnifiedApplications:test')

    const created = await store.createApplication({
      companyName: 'Local Inc',
      jobTitle: 'Frontend Engineer',
      status: 'Aplicado',
      modality: 'Remoto',
      workLocation: '',
      dateApplied: '2026-04-25',
      url: '',
      notes: '',
    })

    expect(store.source.value).toBe('local')
    expect(store.applications.value).toHaveLength(1)

    const updated = await store.updateApplication(created.id, { status: 'Oferta' })
    expect(updated?.status).toBe('Oferta')

    const deleted = await store.deleteApplication(created.id)
    expect(deleted).toBe(true)
    expect(store.applications.value).toHaveLength(0)
  })

  it('falls back to local when remote operation fails after auth mode', async () => {
    const store = useUnifiedApplications('useUnifiedApplications:remote-fallback')

    await store.activateRemote()
    expect(store.source.value).toBe('remote')

    applicationsServiceMock.upsertRemoteApplication.mockRejectedValue(new Error('network down'))

    await store.createApplication({
      companyName: 'Fallback Corp',
      jobTitle: 'Backend Engineer',
      status: 'Aplicado',
      modality: 'Remoto',
      workLocation: '',
      dateApplied: '2026-04-26',
      url: '',
      notes: '',
    })

    expect(store.source.value).toBe('local')
    expect(store.remoteError.value).toContain('network down')
    expect(store.applications.value).toHaveLength(1)
  })
})
