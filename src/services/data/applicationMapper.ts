import { normalizeApplicationModality } from '../../constants/modalities'
import { normalizeApplicationStatus } from '../../constants/statuses'
import type { Application } from '../../types/application'
import type { RemoteApplicationRecord } from '../../types/remoteApplication'

const LIMITS = {
  companyName: 200,
  jobTitle: 200,
  workLocation: 300,
  url: 2048,
  notes: 5000,
} as const

type RemoteApplicationLike = Partial<RemoteApplicationRecord> & {
  companyName?: string
  jobTitle?: string
  workLocation?: string | null
  dateApplied?: string | null
  isInteresting?: boolean
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function validateApplicationData(app: unknown): void {
  if (!app || typeof app !== 'object') {
    throw new Error('Datos de aplicación inválidos')
  }

  const errors: string[] = []
  const a = app as Record<string, unknown>

  if (!a.companyName || typeof a.companyName !== 'string' || !a.companyName.trim()) {
    errors.push('El nombre de la empresa es obligatorio')
  } else if (a.companyName.length > LIMITS.companyName) {
    errors.push(`El nombre de la empresa no puede exceder ${LIMITS.companyName} caracteres`)
  }

  if (!a.jobTitle || typeof a.jobTitle !== 'string' || !a.jobTitle.trim()) {
    errors.push('El puesto es obligatorio')
  } else if (a.jobTitle.length > LIMITS.jobTitle) {
    errors.push(`El puesto no puede exceder ${LIMITS.jobTitle} caracteres`)
  }

  if (a.workLocation && typeof a.workLocation === 'string' && a.workLocation.length > LIMITS.workLocation) {
    errors.push(`La ubicación no puede exceder ${LIMITS.workLocation} caracteres`)
  }

  if (a.url && typeof a.url === 'string' && a.url.length > LIMITS.url) {
    errors.push(`La URL no puede exceder ${LIMITS.url} caracteres`)
  }

  if (a.notes && typeof a.notes === 'string' && a.notes.length > LIMITS.notes) {
    errors.push(`Las notas no pueden exceder ${LIMITS.notes} caracteres`)
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '))
  }
}

export function toApplication(record: RemoteApplicationLike): Application {
  const companyName = readString(record.company_name ?? record.companyName)
  const jobTitle = readString(record.job_title ?? record.jobTitle)
  const workLocation = record.work_location ?? record.workLocation ?? ''
  const dateApplied = readString(record.date_applied ?? record.dateApplied) || new Date().toISOString().split('T')[0]
  const isInteresting = readBoolean(record.is_interesting ?? record.isInteresting)

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
    isInteresting,
  }
}

export function toRemoteRecord(application: Application): Omit<RemoteApplicationRecord, 'user_id' | 'created_at' | 'updated_at'> {
  validateApplicationData(application)
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
    is_interesting: application.isInteresting,
    sync_origin: 'local',
  }
}
