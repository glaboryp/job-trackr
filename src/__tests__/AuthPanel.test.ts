import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'

import AuthPanel from '../components/AuthPanel.vue'

let mountedWrapper: VueWrapper | null = null

afterEach(() => {
  mountedWrapper?.unmount()
  mountedWrapper = null
})

describe('AuthPanel', () => {
  it('emits login credentials in login mode', async () => {
    // The login button is type="submit" inside a <form>. jsdom only performs
    // implicit form submission for forms connected to the document, so the
    // component must be attached, like in a real browser.
    const wrapper = mount(AuthPanel, {
      attachTo: document.body,
      props: {
        authEnabled: true,
        isBusy: false,
        userEmail: null,
        errorMessage: null,
      },
    })
    mountedWrapper = wrapper

    await wrapper.get('[data-testid="auth-login-email"]').setValue('user@example.com')
    await wrapper.get('[data-testid="auth-login-password"]').setValue('secret-123')
    await wrapper.get('[data-testid="auth-login-submit"]').trigger('click')

    expect(wrapper.emitted('login')).toBeTruthy()
    expect(wrapper.emitted('login')?.[0]).toEqual([
      {
        email: 'user@example.com',
        password: 'secret-123',
      },
    ])
  })

  it('emits signup payload after validation', async () => {
    const wrapper = mount(AuthPanel, {
      props: {
        authEnabled: true,
        isBusy: false,
        userEmail: null,
        errorMessage: null,
      },
    })

    await wrapper.get('[data-testid="auth-tab-signup"]').trigger('click')
    await wrapper.get('[data-testid="auth-signup-email"]').setValue('new@example.com')
    await wrapper.get('[data-testid="auth-signup-password"]').setValue('password123')
    await wrapper.get('[data-testid="auth-signup-confirm"]').setValue('password123')
    await wrapper.get('[data-testid="auth-signup-submit"]').trigger('click')

    expect(wrapper.emitted('signup')).toBeTruthy()
    expect(wrapper.emitted('signup')?.[0]).toEqual([
      {
        email: 'new@example.com',
        password: 'password123',
      },
    ])
  })

  it('shows active session and emits logout when logged in', async () => {
    const wrapper = mount(AuthPanel, {
      props: {
        authEnabled: true,
        isBusy: false,
        userEmail: 'person@example.com',
        errorMessage: null,
      },
    })

    expect(wrapper.get('[data-testid="auth-session-email"]').text()).toContain('person@example.com')

    await wrapper.get('[data-testid="auth-logout"]').trigger('click')
    expect(wrapper.emitted('logout')).toBeTruthy()
  })
})
