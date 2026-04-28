export type AuthUser = {
  id: string
  email: string | null
}

export type AuthErrorCode =
  | 'unauthorized'
  | 'invalid_credentials'
  | 'rate_limited'
  | 'network_error'
  | 'config_error'
  | 'unknown_error'

export type AuthServiceError = {
  code: AuthErrorCode
  message: string
  retryable: boolean
  originalError?: unknown
}

export type AuthCredentials = {
  email: string
  password: string
}
