import type { Application } from '../../types/application'
import type { RemoteApplicationRecord } from '../../types/remoteApplication'
import { toApplication } from '../../services/data/applicationMapper'

type MergeCandidate = {
  application: Application
  updatedAt: string
  source: 'local' | 'remote'
}

function toFingerprint(application: Application): string {
  return [
    application.companyName.trim().toLowerCase(),
    application.jobTitle.trim().toLowerCase(),
    application.dateApplied,
    application.modality,
  ].join('::')
}

function toKey(application: Application): string {
  if (application.id.trim().length > 0) {
    return `id:${application.id}`
  }

  return `fp:${toFingerprint(application)}`
}

function compareCandidates(left: MergeCandidate, right: MergeCandidate): number {
  const dateComparison = left.updatedAt.localeCompare(right.updatedAt)
  if (dateComparison !== 0) {
    return dateComparison
  }

  const idComparison = left.application.id.localeCompare(right.application.id)
  if (idComparison !== 0) {
    return idComparison
  }

  return left.source.localeCompare(right.source)
}

export function mergeApplicationsDeterministic(
  localApplications: Application[],
  remoteApplications: RemoteApplicationRecord[],
): Application[] {
  const mergedByKey = new Map<string, MergeCandidate>()

  for (const localApplication of localApplications) {
    const key = toKey(localApplication)
    mergedByKey.set(key, {
      application: localApplication,
      updatedAt: localApplication.dateApplied,
      source: 'local',
    })
  }

  for (const remoteRecord of remoteApplications) {
    const remoteApplication = toApplication(remoteRecord)
    const key = toKey(remoteApplication)

    const candidate: MergeCandidate = {
      application: remoteApplication,
      updatedAt: remoteRecord.updated_at,
      source: 'remote',
    }

    const current = mergedByKey.get(key)
    if (!current || compareCandidates(current, candidate) <= 0) {
      mergedByKey.set(key, candidate)
    }
  }

  return [...mergedByKey.values()]
    .sort((left, right) => {
      const dateComparison = right.updatedAt.localeCompare(left.updatedAt)
      if (dateComparison !== 0) {
        return dateComparison
      }

      return left.application.id.localeCompare(right.application.id)
    })
    .map((entry) => entry.application)
}
