import { computed, ref } from 'vue'

import { InsforgeConfigError, readInsforgeConfig } from '../config/insforge'
import { authService } from '../services/auth/authService'
import type { AuthCredentials, AuthServiceError, AuthUser } from '../types/auth'
import type { SessionState, SessionStatus } from '../types/session'
import type { ConflictSnapshot } from '../types/sync'

function normalizeSessionError(error: unknown): string {
  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (error instanceof InsforgeConfigError) {
    return `${error.message}. La app seguirá en modo anónimo.`
  }

  const authError = error as Partial<AuthServiceError>
  if (typeof authError.message === 'string' && authError.message.trim()) {
    return authError.message
  }

  return 'No se pudo completar la operación de autenticación.'
}

export function useSession() {
  const status = ref<SessionStatus>('bootstrapping')
  const user = ref<AuthUser | null>(null)
  const errorMessage = ref<string | null>(null)
  const conflict = ref<ConflictSnapshot | null>(null)

  const authEnabled = computed(() => readInsforgeConfig({ strict: false }).authEnabled)
  const isAnonymous = computed(() => status.value === 'anonymous')
  const isAuthenticated = computed(() => status.value === 'authenticated')
  const shouldBlockBoard = computed(() => status.value === 'conflict_required' || status.value === 'reconciling')

  async function bootstrap(): Promise<void> {
    errorMessage.value = null
    conflict.value = null

    if (!authEnabled.value) {
      user.value = null
      status.value = 'anonymous'
      return
    }

    try {
      readInsforgeConfig({ strict: true })
      const currentUser = await authService.getCurrentUser()

      user.value = currentUser
      status.value = currentUser ? 'authenticated' : 'anonymous'
    } catch (error) {
      const isAuthError = error instanceof Object && (error as Record<string, unknown>).code === 'invalid_credentials'
      if (!isAuthError) {
        user.value = null
        status.value = 'error'
        errorMessage.value = normalizeSessionError(error)
        return
      }

      // For 401 errors during bootstrap (no prior session), silently treat as anonymous
      user.value = null
      status.value = 'anonymous'
    }
  }

  async function signup(credentials: AuthCredentials): Promise<AuthUser> {
    try {
      const createdUser = await authService.register(credentials)
      user.value = createdUser
      status.value = 'authenticated'
      errorMessage.value = null
      return createdUser
    } catch (error) {
      status.value = 'error'
      errorMessage.value = normalizeSessionError(error)
      throw error
    }
  }

  async function login(credentials: AuthCredentials): Promise<AuthUser> {
    try {
      const loggedInUser = await authService.login(credentials)
      user.value = loggedInUser
      status.value = 'authenticated'
      errorMessage.value = null
      return loggedInUser
    } catch (error) {
      status.value = 'error'
      errorMessage.value = normalizeSessionError(error)
      throw error
    }
  }

  async function logout(): Promise<void> {
    try {
      await authService.logout()
    } catch {
      // Keep the app usable as anonymous even if logout request fails.
    }

    user.value = null
    conflict.value = null
    errorMessage.value = null
    status.value = 'anonymous'
  }

  function requireConflict(snapshot: ConflictSnapshot): void {
    conflict.value = snapshot
    errorMessage.value = null
    status.value = 'conflict_required'
  }

  function startReconciling(): void {
    status.value = 'reconciling'
    errorMessage.value = null
  }

  function resolveConflict(nextUser?: AuthUser | null): void {
    conflict.value = null
    status.value = 'authenticated'
    user.value = nextUser ?? user.value
    errorMessage.value = null
  }

  function moveToAnonymousWithError(message: string): void {
    user.value = null
    conflict.value = null
    errorMessage.value = message
    status.value = 'anonymous'
  }

  function clearError(): void {
    if (status.value === 'error') {
      status.value = user.value ? 'authenticated' : 'anonymous'
    }

    errorMessage.value = null
  }

  function setRecoverableError(message: string): void {
    errorMessage.value = message
  }

  async function requestPasswordReset(email: string): Promise<void> {
    try {
      await authService.requestPasswordReset(email)
      errorMessage.value = null
    } catch (error) {
      errorMessage.value = normalizeSessionError(error)
      throw error
    }
  }

  async function confirmPasswordReset(newPassword: string, token?: string): Promise<void> {
    try {
      await authService.confirmPasswordReset(newPassword, token)
      errorMessage.value = null
    } catch (error) {
      errorMessage.value = normalizeSessionError(error)
      throw error
    }
  }

  const state = computed<SessionState>(() => ({
    status: status.value,
    user: user.value,
    errorMessage: errorMessage.value,
    conflict: conflict.value,
  }))

  return {
    status,
    user,
    errorMessage,
    conflict,
    state,
    authEnabled,
    isAnonymous,
    isAuthenticated,
    shouldBlockBoard,
    bootstrap,
    signup,
    login,
    logout,
    requireConflict,
    startReconciling,
    resolveConflict,
    moveToAnonymousWithError,
    setRecoverableError,
    clearError,
    requestPasswordReset,
    confirmPasswordReset,
  }
}
