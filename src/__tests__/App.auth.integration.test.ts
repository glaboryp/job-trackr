import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const authServiceMock = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  requestPasswordReset: vi.fn(),
  confirmPasswordReset: vi.fn(),
}))

const applicationsServiceMock = vi.hoisted(() => ({
  listRemoteApplications: vi.fn(),
  upsertRemoteApplication: vi.fn(),
  deleteRemoteApplication: vi.fn(),
  reconcileApplications: vi.fn(),
}))

vi.mock('../services/auth/authService', () => ({
  authService: authServiceMock,
}))

vi.mock('../services/data/applicationsService', () => ({
  applicationsService: applicationsServiceMock,
  createApplicationsService: () => applicationsServiceMock,
}))

import App from '../App.vue'

describe('App auth integration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllEnvs()

    vi.stubEnv('VITE_INSFORGE_AUTH_ENABLED', 'true')
    vi.stubEnv('VITE_INSFORGE_URL', 'https://example.insforge.app')
    vi.stubEnv('VITE_INSFORGE_ANON_KEY', 'public-key')

    authServiceMock.getCurrentUser.mockResolvedValue(null)
    authServiceMock.login.mockResolvedValue({ id: 'user-1', email: 'user@example.com' })

    applicationsServiceMock.listRemoteApplications.mockResolvedValue([])
    applicationsServiceMock.reconcileApplications.mockResolvedValue({
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      applications: [
        {
          id: 'remote-1',
          companyName: 'Remote Corp',
          jobTitle: 'Backend Engineer',
          status: 'Oferta',
          modality: 'Remoto',
          workLocation: '',
          dateApplied: '2026-04-22',
          url: '',
          notes: '',
        },
      ],
    })
  })

  it('shows blocking conflict modal after login when local and remote data coexist', async () => {
    const wrapper = mount(App)
    await flushPromises()

    await wrapper.get('[data-testid="open-create"]').trigger('click')
    await wrapper.get('#companyName').setValue('Local Corp')
    await wrapper.get('#jobTitle').setValue('Frontend Engineer')
    await wrapper.get('[data-testid="application-modality"]').setValue('Remoto')
    await wrapper.get('form').trigger('submit.prevent')

    applicationsServiceMock.listRemoteApplications.mockResolvedValue([
      {
        id: 'remote-1',
        companyName: 'Remote Corp',
        jobTitle: 'Backend Engineer',
        status: 'Oferta',
        modality: 'Remoto',
        workLocation: '',
        dateApplied: '2026-04-22',
        url: '',
        notes: '',
      },
    ])

    await wrapper.get('[data-testid="open-auth-panel"]').trigger('click')

    await wrapper.get('[data-testid="auth-login-email"]').setValue('user@example.com')
    await wrapper.get('[data-testid="auth-login-password"]').setValue('password-123')
    await wrapper.get('[data-testid="auth-login-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="conflict-modal"]').exists()).toBe(true)

    await wrapper.get('[data-testid="conflict-keep-account"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="conflict-modal"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Remote Corp')
  })

  it('applies keep_local strategy when selected in conflict modal', async () => {
    const wrapper = mount(App)
    await flushPromises()

    await wrapper.get('[data-testid="open-create"]').trigger('click')
    await wrapper.get('#companyName').setValue('Local Wins Inc')
    await wrapper.get('#jobTitle').setValue('Frontend Engineer')
    await wrapper.get('[data-testid="application-modality"]').setValue('Remoto')
    await wrapper.get('form').trigger('submit.prevent')

    applicationsServiceMock.listRemoteApplications.mockResolvedValue([
      {
        id: 'remote-2',
        companyName: 'Remote Legacy',
        jobTitle: 'Backend Engineer',
        status: 'Oferta',
        modality: 'Remoto',
        workLocation: '',
        dateApplied: '2026-04-22',
        url: '',
        notes: '',
      },
    ])

    applicationsServiceMock.reconcileApplications.mockResolvedValue({
      created: 1,
      updated: 0,
      deleted: 1,
      skipped: 0,
      applications: [
        {
          id: 'local-keep-1',
          companyName: 'Local Wins Inc',
          jobTitle: 'Frontend Engineer',
          status: 'Aplicado',
          modality: 'Remoto',
          workLocation: '',
          dateApplied: '2026-04-23',
          url: '',
          notes: '',
        },
      ],
    })

    await wrapper.get('[data-testid="open-auth-panel"]').trigger('click')

    await wrapper.get('[data-testid="auth-login-email"]').setValue('user@example.com')
    await wrapper.get('[data-testid="auth-login-password"]').setValue('password-123')
    await wrapper.get('[data-testid="auth-login-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="conflict-modal"]').exists()).toBe(true)

    await wrapper.get('[data-testid="conflict-keep-local"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="conflict-modal"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Local Wins Inc')
    expect(wrapper.text()).not.toContain('Remote Legacy')
  })
})
