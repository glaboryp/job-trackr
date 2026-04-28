import { describe, expect, it } from 'vitest'

import { mergeApplicationsDeterministic } from '../lib/sync/mergeApplications'
import type { Application } from '../types/application'
import type { RemoteApplicationRecord } from '../types/remoteApplication'

function createLocalApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 'local-1',
    companyName: 'Acme',
    jobTitle: 'Frontend Engineer',
    status: 'Aplicado',
    modality: 'Remoto',
    workLocation: '',
    dateApplied: '2026-04-21',
    url: '',
    notes: '',
    ...overrides,
  }
}

function createRemoteRecord(overrides: Partial<RemoteApplicationRecord> = {}): RemoteApplicationRecord {
  return {
    id: 'remote-1',
    user_id: 'user-1',
    company_name: 'Acme',
    job_title: 'Frontend Engineer',
    status: 'Oferta',
    modality: 'Remoto',
    work_location: '',
    date_applied: '2026-04-21',
    url: '',
    notes: '',
    created_at: '2026-04-21T08:00:00.000Z',
    updated_at: '2026-04-22T08:00:00.000Z',
    sync_origin: 'remote',
    ...overrides,
  }
}

describe('mergeApplicationsDeterministic', () => {
  it('prefers most recent remote payload when keys collide', () => {
    const local = [createLocalApplication({ id: 'same-id', status: 'Aplicado' })]
    const remote = [createRemoteRecord({ id: 'same-id', status: 'Oferta', updated_at: '2026-04-25T12:30:00.000Z' })]

    const merged = mergeApplicationsDeterministic(local, remote)

    expect(merged).toHaveLength(1)
    expect(merged[0].id).toBe('same-id')
    expect(merged[0].status).toBe('Oferta')
  })

  it('uses stable tie-break by id when updated_at is equal', () => {
    const local = [
      createLocalApplication({ id: 'b-id', companyName: 'Tie Corp' }),
      createLocalApplication({ id: 'a-id', companyName: 'Tie Corp' }),
    ]

    const merged = mergeApplicationsDeterministic(local, [])

    expect(merged.map((application) => application.id)).toEqual(['a-id', 'b-id'])
  })

  it('is deterministic across repeated runs for same fixtures', () => {
    const local = [
      createLocalApplication({ id: 'local-1', companyName: 'Alpha', dateApplied: '2026-04-02' }),
      createLocalApplication({ id: 'local-2', companyName: 'Beta', dateApplied: '2026-04-03' }),
    ]

    const remote = [
      createRemoteRecord({ id: 'local-2', company_name: 'Beta', updated_at: '2026-04-04T00:00:00.000Z' }),
      createRemoteRecord({ id: 'remote-3', company_name: 'Gamma', updated_at: '2026-04-05T00:00:00.000Z' }),
    ]

    const first = mergeApplicationsDeterministic(local, remote)
    const second = mergeApplicationsDeterministic(local, remote)

    expect(second).toEqual(first)
  })
})
