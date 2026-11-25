import { SupabaseConfigError } from '../../config/supabase'
import { getSupabaseClient } from '../../lib/supabase/client'
import type { AuthCredentials, AuthServiceError, AuthUser } from '../../types/auth'

type AuthService = {
  register: (credentials: AuthCredentials) => Promise<AuthUser>
  login: (credentials: AuthCredentials) => Promise<AuthUser>
  logout: () => Promise<void>
  getCurrentUser: () => Promise<AuthUser | null>
  requestPasswordReset: (email: string) => Promise<void>
  confirmPasswordReset: (newPassword: string, token?: string) => Promise<void>
  resendSignupConfirmation: (email: string) => Promise<void>
}

function normalizeAuthError(error: unknown, fallback: string): AuthServiceError {
  if (error instanceof SupabaseConfigError) {
    return { code: 'config_error', message: `${error.message}. Revisa tu archivo .env.`, retryable: false, originalError: error }
  }

  const item = error as { message?: unknown; status?: unknown; code?: unknown } | null
  const message = typeof item?.message === 'string' && item.message.trim() ? item.message : fallback
  const status = Number(item?.status ?? 0)
  const code = typeof item?.code === 'string' ? item.code.toLowerCase() : ''

  if (/confirm your email|confirma tu email/i.test(message)) {
    return { code: 'email_confirmation_required', message, retryable: false, originalError: error }
  }
  if (/already registered|already exists|user already/i.test(message)) {
    return { code: 'user_already_exists', message: 'Ya existe una cuenta con ese email.', retryable: false, originalError: error }
  }
  if (status === 400 || status === 401 || code.includes('invalid_credentials') || code.includes('invalid_login')) {
    return { code: 'invalid_credentials', message: 'Email o contraseña incorrectos.', retryable: false, originalError: error }
  }
  if (status === 429 || code.includes('rate_limit')) {
    return { code: 'rate_limited', message, retryable: true, originalError: error }
  }
  if (status >= 500 || error instanceof TypeError) {
    return { code: 'network_error', message, retryable: true, originalError: error }
  }
  return { code: 'unknown_error', message, retryable: true, originalError: error }
}

function toAuthUser(user: { id: string; email?: string | null }): AuthUser {
  return { id: user.id, email: user.email ?? null }
}

function throwNormalized(error: unknown, fallback: string): never {
  throw normalizeAuthError(error, fallback)
}

export function createAuthService(): AuthService {
  return {
    async register(credentials) {
      const client = getSupabaseClient()
      const { data, error } = await client.auth.signUp({
        email: credentials.email.trim(),
        password: credentials.password,
      })
      if (error) throwNormalized(error, 'No fue posible crear la cuenta.')
      if (!data.user) throwNormalized(new Error('Supabase no devolvió el usuario creado.'), 'No fue posible crear la cuenta.')
      if (!data.session) {
        throwNormalized(new Error('Cuenta creada. Confirma tu email desde el enlace que te hemos enviado y después inicia sesión.'), 'Confirma tu email para continuar.')
      }
      return toAuthUser(data.user)
    },

    async login(credentials) {
      const { data, error } = await getSupabaseClient().auth.signInWithPassword({
        email: credentials.email.trim(),
        password: credentials.password,
      })
      if (error) throwNormalized(error, 'No fue posible iniciar sesión.')
      if (!data.user) throwNormalized(new Error('Supabase no devolvió el usuario.'), 'No fue posible iniciar sesión.')
      return toAuthUser(data.user)
    },

    async logout() {
      const { error } = await getSupabaseClient().auth.signOut()
      if (error) throwNormalized(error, 'No fue posible cerrar sesión.')
    },

    async getCurrentUser() {
      const { data, error } = await getSupabaseClient().auth.getUser()
      if (error) {
        if (error.status === 401) return null
        throwNormalized(error, 'No fue posible recuperar la sesión actual.')
      }
      return data.user ? toAuthUser(data.user) : null
    },

    async requestPasswordReset(email) {
      const redirectTo = typeof window === 'undefined' ? undefined : `${window.location.origin}/`
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim(), { redirectTo })
      if (error) throwNormalized(error, 'No fue posible iniciar el reseteo de contraseña.')
    },

    async confirmPasswordReset(newPassword) {
      const { error } = await getSupabaseClient().auth.updateUser({ password: newPassword })
      if (error) throwNormalized(error, 'No fue posible actualizar la contraseña.')
    },

    async resendSignupConfirmation(email) {
      const { error } = await getSupabaseClient().auth.resend({ type: 'signup', email: email.trim() })
      if (error) throwNormalized(error, 'No fue posible reenviar el correo de confirmación.')
    },
  }
}

export const authService = createAuthService()
