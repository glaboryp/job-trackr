import type { ApplicationStatus } from '../constants/statuses'
import type { ApplicationModality } from '../constants/modalities'

export type Application = {
  id: string
  companyName: string
  jobTitle: string
  status: ApplicationStatus
  modality: ApplicationModality
  workLocation: string
  dateApplied: string
  url: string
  notes: string
}
