import { beforeEach, describe, expect, it, vi } from 'vitest'

const authServiceMock = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
}))

vi.mock('../services/auth/authService', () => ({
  authService: authServiceMock,
}))

import { useSession } from '../composables/useSession'

describe('useSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()

    authServiceMock.register.mockReset()
    authServiceMock.login.mockReset()
    authServiceMock.logout.mockReset()
    authServiceMock.getCurrentUser.mockReset()
    authServiceMock.requestPasswordReset.mockReset()
    authServiceMock.confirmPasswordReset.mockReset()
  })

  it('boots into anonymous mode when auth is disabled', async () => {
    vi.stubEnv('VITE_INSFORGE_AUTH_ENABLED', 'false')

    const session = useSession()
    await session.bootstrap()

    expect(session.status.value).toBe('anonymous')
    expect(authServiceMock.getCurrentUser).not.toHaveBeenCalled()
  })

  it('reports explicit config error when auth is enabled but vars are missing', async () => {
    vi.stubEnv('VITE_INSFORGE_AUTH_ENABLED', 'true')
    vi.stubEnv('VITE_INSFORGE_URL', '')
    vi.stubEnv('VITE_INSFORGE_ANON_KEY', '')

    const session = useSession()
    await session.bootstrap()

    expect(session.status.value).toBe('error')
    expect(session.errorMessage.value).toContain('VITE_INSFORGE_URL')
  })

  it('logs in and reaches authenticated state', async () => {
    vi.stubEnv('VITE_INSFORGE_AUTH_ENABLED', 'true')
    vi.stubEnv('VITE_INSFORGE_URL', 'https://example.insforge.app')
    vi.stubEnv('VITE_INSFORGE_ANON_KEY', 'public-key')

    authServiceMock.login.mockResolvedValue({ id: 'user-1', email: 'user@example.com' })

    const session = useSession()
    await session.login({ email: 'user@example.com', password: 'secret' })

    expect(session.status.value).toBe('authenticated')
    expect(session.user.value?.id).toBe('user-1')
  })
})
