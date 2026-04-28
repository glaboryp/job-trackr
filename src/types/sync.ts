import type { Application } from './application'

export type ReconcileStrategy = 'merge' | 'keep_account' | 'keep_local'

export type ReconcileRequest = {
  strategy: ReconcileStrategy
  localApplications: Application[]
  idempotencyKey: string
}

export type ReconcileResult = {
  created: number
  updated: number
  deleted: number
  skipped: number
  applications: Application[]
}

export type ConflictSnapshot = {
  localApplications: Application[]
  remoteApplications: Application[]
}
