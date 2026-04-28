import type { AuthUser } from './auth'
import type { ConflictSnapshot } from './sync'

export type SessionStatus =
  | 'bootstrapping'
  | 'anonymous'
  | 'authenticated'
  | 'conflict_required'
  | 'reconciling'
  | 'error'

export type SessionState = {
  status: SessionStatus
  user: AuthUser | null
  errorMessage: string | null
  conflict: ConflictSnapshot | null
}
