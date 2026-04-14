import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useApplications } from '../composables/useApplications'
import type { ApplicationStatus } from '../constants/statuses'

const STORAGE_KEY = 'useApplications:test'

type ApplicationInput = {
  companyName: string
  jobTitle: string
  status: ApplicationStatus
  dateApplied: string
  url: string
  notes: string
}

function createInput(overrides: Partial<ApplicationInput> = {}): ApplicationInput {
  return {
    companyName: 'ACME',
    jobTitle: 'Frontend Developer',
    status: 'Aplicado',
    dateApplied: '2026-04-13',
    url: 'https://example.com/jobs/1',
    notes: 'Initial contact',
    ...overrides,
  }
}

describe('useApplications', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('loads from storage and keeps CRUD + move operations persisted', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const composable = useApplications(STORAGE_KEY)

    const first = composable.createApplication(createInput({ companyName: 'ACME', status: 'Aplicado' }))
    const second = composable.createApplication(
      createInput({ companyName: 'Globex', status: 'Entrevista Inicial' }),
    )
    const third = composable.createApplication(
      createInput({ companyName: 'Initech', status: 'Entrevista Inicial' }),
    )

    expect(first.id).not.toBe(second.id)
    expect(second.id).not.toBe(third.id)
    expect(first.id).not.toBe(third.id)

    const updated = composable.updateApplication(second.id, {
      notes: 'Updated notes',
      jobTitle: 'Senior Frontend Developer',
    })

    expect(updated).not.toBeNull()
    expect(updated?.id).toBe(second.id)
    expect(updated?.notes).toBe('Updated notes')
    expect(updated?.jobTitle).toBe('Senior Frontend Developer')

    const moved = composable.moveApplication(first.id, 'Entrevista Inicial', 1)

    expect(moved).not.toBeNull()
    expect(moved?.status).toBe('Entrevista Inicial')

    const deleted = composable.deleteApplication(third.id)

    expect(deleted).toBe(true)
    expect(composable.applications.value.map((application) => application.id)).toEqual([second.id, first.id])
    expect(composable.applications.value.every((application) => application.status === 'Entrevista Inicial')).toBe(
      true,
    )

    expect(setItemSpy).toHaveBeenCalledTimes(6)

    const persistedRaw = localStorage.getItem(STORAGE_KEY)
    expect(persistedRaw).not.toBeNull()
    expect(JSON.parse(persistedRaw ?? '[]')).toEqual(composable.applications.value)

    const reloaded = useApplications(STORAGE_KEY)
    expect(reloaded.applications.value).toEqual(composable.applications.value)
  })

  it('falls back safely to empty array when storage json is corrupted', () => {
    localStorage.setItem(STORAGE_KEY, '{this-is-not-valid-json')

    const composable = useApplications(STORAGE_KEY)

    expect(composable.applications.value).toEqual([])

    const created = composable.createApplication(createInput({ companyName: 'Recovered Corp' }))

    expect(created.id).toBeTypeOf('string')
    expect(composable.applications.value).toHaveLength(1)
    expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify(composable.applications.value))
  })
})
