import type { ApplicationStatus } from '../constants/statuses'

export type Application = {
  id: string
  companyName: string
  jobTitle: string
  status: ApplicationStatus
  dateApplied: string
  url: string
  notes: string
}
