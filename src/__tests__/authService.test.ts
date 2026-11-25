import { beforeEach, describe, expect, it, vi } from 'vitest'

const getClientMock = vi.hoisted(() => vi.fn())

vi.mock('../lib/supabase/client', () => ({
  getSupabaseClient: getClientMock,
}))

import { createAuthService } from '../services/auth/authService'

function createClient() {
  return {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  }
}

describe('authService', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    getClientMock.mockReset()
  })

  it('registers a user and returns the normalized profile', async () => {
    const client = createClient()
    client.auth.signUp.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'person@example.com' }, session: { access_token: 'token' } },
      error: null,
    })
    getClientMock.mockReturnValue(client)

    const user = await createAuthService().register({ email: 'person@example.com', password: 'secret-123' })
    expect(user).toEqual({ id: 'user-1', email: 'person@example.com' })
    expect(client.auth.signUp).toHaveBeenCalledWith({ email: 'person@example.com', password: 'secret-123' })
  })

  it('maps invalid credentials on login', async () => {
    const client = createClient()
    client.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { status: 400, code: 'invalid_credentials', message: 'invalid credentials' } })
    getClientMock.mockReturnValue(client)

    await expect(createAuthService().login({ email: 'person@example.com', password: 'bad-password' }))
      .rejects.toMatchObject({ code: 'invalid_credentials', retryable: false })
  })

  it('requests and confirms password reset through Supabase Auth', async () => {
    const client = createClient()
    client.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    client.auth.updateUser.mockResolvedValue({ error: null })
    getClientMock.mockReturnValue(client)

    const service = createAuthService()
    await service.requestPasswordReset('person@example.com')
    await service.confirmPasswordReset('new-password-123', 'ignored-legacy-token')

    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith('person@example.com', expect.any(Object))
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'new-password-123' })
  })
})
