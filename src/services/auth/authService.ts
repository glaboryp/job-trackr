import { InsforgeConfigError } from '../../config/insforge'
import { getInsforgeClient } from '../../lib/insforge/client'
import type { AuthCredentials, AuthServiceError, AuthUser } from '../../types/auth'

type GenericObject = Record<string, unknown>

type AuthService = {
  register: (credentials: AuthCredentials) => Promise<AuthUser>
  login: (credentials: AuthCredentials) => Promise<AuthUser>
  logout: () => Promise<void>
  getCurrentUser: () => Promise<AuthUser | null>
  requestPasswordReset: (email: string) => Promise<void>
  confirmPasswordReset: (newPassword: string, token?: string) => Promise<void>
}

function isObject(value: unknown): value is GenericObject {
  return typeof value === 'object' && value !== null
}

function normalizeMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string' && error.trim()) {
    return error.trim()
  }

  if (isObject(error)) {
    const errorMessage = error.message
    if (typeof errorMessage === 'string' && errorMessage.trim()) {
      return errorMessage
    }
  }

  return fallback
}

function normalizeAuthError(error: unknown, fallbackMessage: string): AuthServiceError {
  if (error instanceof InsforgeConfigError) {
    return {
      code: 'config_error',
      message: `${error.message}. Revisa tu archivo .env.`,
      retryable: false,
      originalError: error,
    }
  }

  if (isObject(error)) {
    const status = Number(error.status ?? error.statusCode ?? 0)
    const sourceCode = typeof error.code === 'string' ? error.code.toLowerCase() : ''

    if (status === 401 || status === 403 || sourceCode.includes('invalid_credentials')) {
      return {
        code: 'invalid_credentials',
        message: normalizeMessage(error, 'Credenciales inválidas.'),
        retryable: false,
        originalError: error,
      }
    }

    if (status === 429 || sourceCode.includes('rate_limit')) {
      return {
        code: 'rate_limited',
        message: normalizeMessage(error, 'Se excedió el límite de intentos. Intenta más tarde.'),
        retryable: true,
        originalError: error,
      }
    }

    if (status >= 500) {
      return {
        code: 'network_error',
        message: normalizeMessage(error, 'No se pudo contactar el servicio de autenticación.'),
        retryable: true,
        originalError: error,
      }
    }
  }

  return {
    code: 'unknown_error',
    message: normalizeMessage(error, fallbackMessage),
    retryable: true,
    originalError: error,
  }
}

function extractResponseData<T>(response: unknown): T {
  if (isObject(response) && 'error' in response && response.error) {
    throw response.error
  }

  if (isObject(response) && 'data' in response) {
    return response.data as T
  }

  return response as T
}

function extractUser(payload: unknown): AuthUser | null {
  if (!isObject(payload)) {
    return null
  }

  const session = isObject(payload.session) ? payload.session : null
  const sessionUser = session && isObject(session.user) ? session.user : null

  const candidates: unknown[] = [
    payload,
    payload.user,
    payload.currentUser,
    payload.profile,
    sessionUser,
  ]

  for (const candidate of candidates) {
    if (!isObject(candidate)) {
      continue
    }

    const id = candidate.id
    if (typeof id !== 'string' || id.length === 0) {
      continue
    }

    return {
      id,
      email: typeof candidate.email === 'string' ? candidate.email : null,
    }
  }

  return null
}

function resolveCallable(root: unknown, path: string): { owner: GenericObject; fn: (...args: unknown[]) => unknown } | null {
  if (!isObject(root)) {
    return null
  }

  const segments = path.split('.')
  let owner: GenericObject = root

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]
    const nextOwner = owner[segment]
    if (!isObject(nextOwner)) {
      return null
    }

    owner = nextOwner
  }

  const methodName = segments[segments.length - 1]
  const candidate = owner[methodName]

  if (typeof candidate !== 'function') {
    return null
  }

  return {
    owner,
    fn: candidate as (...args: unknown[]) => unknown,
  }
}

function extractToken(payload: unknown): string | null {
  if (!isObject(payload)) {
    return null
  }

  const token = payload.accessToken
  if (typeof token === 'string' && token.length > 0) {
    return token
  }

  return null
}

function setClientToken(client: unknown, token: string | null): void {
  if (!isObject(client)) {
    return
  }

  const callable = resolveCallable(client, 'getHttpClient')
  if (!callable) {
    return
  }

  const httpClient = callable.fn.apply(callable.owner, [])
  if (!isObject(httpClient)) {
    return
  }

  const setTokenCallable = resolveCallable(httpClient, 'setAuthToken')
  if (!setTokenCallable) {
    return
  }

  setTokenCallable.fn.apply(setTokenCallable.owner, [token])
}

async function callSdkMethod(client: unknown, paths: string[], args: unknown[]): Promise<unknown> {
  for (const path of paths) {
    const callable = resolveCallable(client, path)
    if (!callable) {
      continue
    }

    return await Promise.resolve(callable.fn.apply(callable.owner, args))
  }

  throw new Error(`No compatible InsForge method found for: ${paths.join(', ')}`)
}

function sanitizeCredentials(credentials: AuthCredentials): AuthCredentials {
  return {
    email: credentials.email.trim(),
    password: credentials.password,
  }
}

export function createAuthService(): AuthService {
  return {
    async register(credentials) {
      try {
        const client = await getInsforgeClient()
        const payload = sanitizeCredentials(credentials)

        const response = await callSdkMethod(
          client,
          [
            'auth.signUp',
            'auth.signup',
            'auth.registerNewUser',
            'registerNewUser',
          ],
          [payload],
        )

        const data = extractResponseData<unknown>(response)
        let user = extractUser(data)

        if (!user) {
          try {
            const currentUserResponse = await callSdkMethod(
              client,
              [
                'auth.getCurrentUser',
                'getCurrentUser',
                'auth.currentUser',
              ],
              [],
            )
            const currentUserData = extractResponseData<unknown>(currentUserResponse)
            user = extractUser(currentUserData)
          } catch {
            // Ignore fallback failures and surface a clearer signup error below.
          }
        }

        if (!user) {
          throw new Error('Registro completado sin sesion activa. Revisa la configuracion de verificacion de email en InsForge.')
        }

        return user
      } catch (error) {
        throw normalizeAuthError(error, 'No fue posible crear la cuenta.')
      }
    },

    async login(credentials) {
      try {
        const client = await getInsforgeClient()
        const payload = sanitizeCredentials(credentials)

        const response = await callSdkMethod(
          client,
          [
            'auth.signInWithPassword',
            'auth.signIn',
            'auth.userLogin',
            'userLogin',
          ],
          [payload],
        )

        const data = extractResponseData<unknown>(response)
        const user = extractUser(data)

        if (!user) {
          throw new Error('Login response does not include user information.')
        }

        // Ensure the access token is explicitly set on the HTTP client
        // (SDK's Auth class should do this via saveSessionFromResponse, but we set it explicitly as a backup)
        const token = extractToken(data)
        console.log('[login] token extracted:', !!token, token ? token.substring(0, 20) + '...' : 'null')
        if (token) {
          setClientToken(client, token)
          console.log('[login] token set on HTTP client')
        }

        return user
      } catch (error) {
        console.error('[login] error:', error)
        throw normalizeAuthError(error, 'No fue posible iniciar sesión.')
      }
    },

    async logout() {
      try {
        const client = await getInsforgeClient()

        const response = await callSdkMethod(
          client,
          [
            'auth.userLogout',
            'userLogout',
            'auth.signOut',
            'auth.logout',
          ],
          [],
        )

        extractResponseData<unknown>(response)

        // Clear the auth token after logout
        // (SDK might handle this too, but we explicitly clear it)
        setClientToken(client, null)
      } catch (error) {
        throw normalizeAuthError(error, 'No fue posible cerrar sesión.')
      }
    },

    async getCurrentUser() {
      try {
        const client = await getInsforgeClient()

        const response = await callSdkMethod(
          client,
          [
            'auth.getCurrentUser',
            'getCurrentUser',
            'auth.currentUser',
          ],
          [],
        )

        const data = extractResponseData<unknown>(response)
        return extractUser(data)
      } catch (error) {
        const normalized = normalizeAuthError(error, 'No fue posible recuperar la sesión actual.')
        // Silently return null for 401/403 (no active session)
        if (normalized.code === 'invalid_credentials' || normalized.code === 'unauthorized') {
          return null
        }

        throw normalized
      }
    },

    async requestPasswordReset(email) {
      try {
        const client = await getInsforgeClient()
        const payload = { email: email.trim() }

        const response = await callSdkMethod(
          client,
          [
            'auth.sendPasswordResetCodeOrLinkBasedOnConfig',
            'sendPasswordResetCodeOrLinkBasedOnConfig',
            'auth.resetPasswordForEmail',
          ],
          [payload],
        )

        extractResponseData<unknown>(response)
      } catch (error) {
        throw normalizeAuthError(error, 'No fue posible iniciar el reseteo de contraseña.')
      }
    },

    async confirmPasswordReset(newPassword, token) {
      try {
        const client = await getInsforgeClient()

        const payload = token
          ? { password: newPassword, token }
          : { password: newPassword }

        const response = await callSdkMethod(
          client,
          [
            'auth.resetUserPassword',
            'resetUserPassword',
            'auth.updatePassword',
            'auth.confirmPasswordReset',
          ],
          [payload],
        )

        extractResponseData<unknown>(response)
      } catch (error) {
        throw normalizeAuthError(error, 'No fue posible actualizar la contraseña.')
      }
    },
  }
}

export const authService = createAuthService()
