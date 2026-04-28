import { beforeEach, describe, expect, it, vi } from 'vitest'

const getClientMock = vi.hoisted(() => vi.fn())

vi.mock('../lib/insforge/client', () => ({
  getInsforgeClient: getClientMock,
}))

import { createAuthService } from '../services/auth/authService'

function createSdkClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      registerNewUser: vi.fn(),
      userLogin: vi.fn(),
      userLogout: vi.fn(),
      getCurrentUser: vi.fn(),
      sendPasswordResetCodeOrLinkBasedOnConfig: vi.fn(),
      resetUserPassword: vi.fn(),
    },
    ...overrides,
  }
}

describe('authService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    getClientMock.mockReset()
  })

  it('registers user and returns normalized profile', async () => {
    const client = createSdkClient()
    ;(client.auth.registerNewUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'person@example.com',
        },
      },
      error: null,
    })

    getClientMock.mockResolvedValue(client)

    const service = createAuthService()
    const user = await service.register({ email: 'person@example.com', password: 'secret-123' })

    expect(user.id).toBe('user-1')
    expect(user.email).toBe('person@example.com')
    expect(client.auth.registerNewUser).toHaveBeenCalledTimes(1)
  })

  it('maps invalid credentials on login', async () => {
    const client = createSdkClient()
    ;(client.auth.userLogin as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: {
        status: 401,
        message: 'invalid credentials',
      },
    })

    getClientMock.mockResolvedValue(client)

    const service = createAuthService()

    await expect(() =>
      service.login({ email: 'person@example.com', password: 'bad-password' }),
    ).rejects.toMatchObject({
      code: 'invalid_credentials',
      retryable: false,
    })
  })

  it('requests and confirms password reset through auth methods', async () => {
    const client = createSdkClient()
    ;(client.auth.sendPasswordResetCodeOrLinkBasedOnConfig as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ok: true },
      error: null,
    })
    ;(client.auth.resetUserPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { ok: true },
      error: null,
    })

    getClientMock.mockResolvedValue(client)

    const service = createAuthService()

    await service.requestPasswordReset('person@example.com')
    await service.confirmPasswordReset('new-password-123', 'token-123')

    expect(client.auth.sendPasswordResetCodeOrLinkBasedOnConfig).toHaveBeenCalledTimes(1)
    expect(client.auth.resetUserPassword).toHaveBeenCalledTimes(1)
  })
})
