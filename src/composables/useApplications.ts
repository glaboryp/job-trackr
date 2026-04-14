import { ref, readonly, type Ref } from 'vue'

import type { Application } from '../types/application'
import type { ApplicationStatus } from '../constants/statuses'

export const APPLICATIONS_STORAGE_KEY = 'job-trackr:applications'

type NewApplicationInput = Omit<Application, 'id'>
type UpdateApplicationInput = Partial<Omit<Application, 'id'>>

type UseApplicationsResult = {
  applications: Readonly<Ref<readonly Application[]>>
  createApplication: (application: NewApplicationInput) => Application
  updateApplication: (id: string, updates: UpdateApplicationInput) => Application | null
  deleteApplication: (id: string) => boolean
  moveApplication: (id: string, nextStatus: ApplicationStatus, nextIndex: number) => Application | null
}

function generateApplicationId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function loadApplications(storageKey: string): Application[] {
  if (typeof globalThis.localStorage === 'undefined') {
    return []
  }

  const serializedApplications = globalThis.localStorage.getItem(storageKey)
  if (!serializedApplications) {
    return []
  }

  try {
    const parsedApplications = JSON.parse(serializedApplications)
    return Array.isArray(parsedApplications) ? (parsedApplications as Application[]) : []
  } catch {
    return []
  }
}

export function useApplications(storageKey = APPLICATIONS_STORAGE_KEY): UseApplicationsResult {
  const applications = ref<Application[]>(loadApplications(storageKey))

  function persist(): void {
    if (typeof globalThis.localStorage === 'undefined') {
      return
    }

    globalThis.localStorage.setItem(storageKey, JSON.stringify(applications.value))
  }

  function createApplication(applicationInput: NewApplicationInput): Application {
    const createdApplication: Application = {
      ...applicationInput,
      id: generateApplicationId(),
    }

    applications.value = [...applications.value, createdApplication]
    persist()
    return createdApplication
  }

  function updateApplication(id: string, updates: UpdateApplicationInput): Application | null {
    const existingIndex = applications.value.findIndex((application) => application.id === id)
    if (existingIndex === -1) {
      return null
    }

    const updatedApplication: Application = {
      ...applications.value[existingIndex],
      ...updates,
      id,
    }

    const nextApplications = [...applications.value]
    nextApplications[existingIndex] = updatedApplication
    applications.value = nextApplications
    persist()
    return updatedApplication
  }

  function deleteApplication(id: string): boolean {
    const previousLength = applications.value.length
    applications.value = applications.value.filter((application) => application.id !== id)
    const wasDeleted = applications.value.length !== previousLength

    if (wasDeleted) {
      persist()
    }

    return wasDeleted
  }

  function moveApplication(
    id: string,
    nextStatus: ApplicationStatus,
    nextIndex: number,
  ): Application | null {
    const currentApplication = applications.value.find((application) => application.id === id)
    if (!currentApplication) {
      return null
    }

    const destinationSiblings = applications.value
      .filter((application) => application.id !== id && application.status === nextStatus)
      .map((application) => application.id)

    const normalizedIndex = Math.max(0, Math.min(nextIndex, destinationSiblings.length))
    const destinationIds = [...destinationSiblings]
    destinationIds.splice(normalizedIndex, 0, id)

    const destinationOrderById = new Map(destinationIds.map((applicationId, index) => [applicationId, index]))

    const movedApplication: Application = {
      ...currentApplication,
      status: nextStatus,
    }

    const withoutCurrent = applications.value.filter((application) => application.id !== id)

    const destinationBucket = withoutCurrent
      .filter((application) => application.status === nextStatus)
      .concat(movedApplication)
      .sort(
        (left, right) =>
          (destinationOrderById.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (destinationOrderById.get(right.id) ?? Number.MAX_SAFE_INTEGER),
      )

    const reorderedApplications: Application[] = []
    let destinationCursor = 0

    for (const application of applications.value) {
      if (application.id === id || application.status === nextStatus) {
        reorderedApplications.push(destinationBucket[destinationCursor])
        destinationCursor += 1
      } else {
        reorderedApplications.push(application)
      }
    }

    applications.value = reorderedApplications
    persist()
    return movedApplication
  }

  return {
    applications: readonly(applications),
    createApplication,
    updateApplication,
    deleteApplication,
    moveApplication,
  }
}
