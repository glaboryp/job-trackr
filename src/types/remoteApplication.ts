export type RemoteApplicationRecord = {
  id: string
  user_id: string
  company_name: string
  job_title: string
  status: string
  modality: string
  work_location: string | null
  date_applied: string
  url: string | null
  notes: string | null
  created_at: string
  updated_at: string
  sync_origin: 'local' | 'remote' | 'merge'
}
