import { normalizeApplicationModality } from '../../constants/modalities'
import { normalizeApplicationStatus } from '../../constants/statuses'
import type { Application } from '../../types/application'
import type { RemoteApplicationRecord } from '../../types/remoteApplication'

type RemoteApplicationLike = Partial<RemoteApplicationRecord> & {
  companyName?: string
  jobTitle?: string
  workLocation?: string | null
  dateApplied?: string | null
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function toApplication(record: RemoteApplicationLike): Application {
  const companyName = readString(record.company_name ?? record.companyName)
  const jobTitle = readString(record.job_title ?? record.jobTitle)
  const workLocation = record.work_location ?? record.workLocation ?? ''
  const dateApplied = readString(record.date_applied ?? record.dateApplied) || new Date().toISOString().split('T')[0]

  return {
    id: readString(record.id),
    companyName,
    jobTitle,
    status: normalizeApplicationStatus(readString(record.status)),
    modality: normalizeApplicationModality(readString(record.modality)),
    workLocation: typeof workLocation === 'string' ? workLocation : '',
    dateApplied,
    url: readString(record.url),
    notes: readString(record.notes),
  }
}

export function toRemoteRecord(application: Application): Omit<RemoteApplicationRecord, 'user_id' | 'created_at' | 'updated_at'> {
  return {
    id: application.id,
    company_name: application.companyName,
    job_title: application.jobTitle,
    status: application.status,
    modality: application.modality,
    work_location: application.workLocation,
    date_applied: application.dateApplied,
    url: application.url,
    notes: application.notes,
    sync_origin: 'local',
  }
}
