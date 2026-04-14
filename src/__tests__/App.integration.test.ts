import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import App from '../App.vue'
import { APPLICATIONS_STORAGE_KEY } from '../composables/useApplications'

const FIRST_STATUS = 'Aplicado'
const SECOND_STATUS = 'Entrevista Inicial'

describe('App integration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('supports create -> edit -> move -> delete with confirmation', async () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
    const wrapper = mount(App)

    await wrapper.get('[data-testid="open-create"]').trigger('click')
    await wrapper.get('#companyName').setValue('Acme')
    await wrapper.get('#jobTitle').setValue('Frontend Engineer')
    await wrapper.get('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Acme')
    expect(wrapper.text()).toContain('Frontend Engineer')

    await wrapper.get('.btn-edit').trigger('click')
    const titleInput = wrapper.get('#jobTitle')
    expect((titleInput.element as HTMLInputElement).value).toBe('Frontend Engineer')
    await titleInput.setValue('Senior Frontend Engineer')
    await wrapper.get('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Senior Frontend Engineer')

    await wrapper.get('.status-select').setValue(SECOND_STATUS)

    const persistedAfterMoveRaw = localStorage.getItem(APPLICATIONS_STORAGE_KEY)
    expect(persistedAfterMoveRaw).not.toBeNull()
    const persistedAfterMove = JSON.parse(persistedAfterMoveRaw ?? '[]') as Array<{ status: string }>
    expect(persistedAfterMove).toHaveLength(1)
    expect(persistedAfterMove[0].status).toBe(SECOND_STATUS)

    await wrapper.get('.btn-delete').trigger('click')
    expect(confirmSpy).toHaveBeenCalledWith('¿Seguro que deseas eliminar esta aplicación?')

    expect(wrapper.find('.job-card').exists()).toBe(false)
    expect(localStorage.getItem(APPLICATIONS_STORAGE_KEY)).toBe('[]')
  })

  it('keeps item and storage when delete is cancelled', async () => {
    const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(false)
    const wrapper = mount(App)

    await wrapper.get('[data-testid="open-create"]').trigger('click')
    await wrapper.get('#companyName').setValue('Globex')
    await wrapper.get('#jobTitle').setValue('QA Engineer')
    await wrapper.get('#status').setValue(FIRST_STATUS)
    await wrapper.get('form').trigger('submit.prevent')

    const beforeDelete = localStorage.getItem(APPLICATIONS_STORAGE_KEY)
    expect(beforeDelete).not.toBeNull()

    await wrapper.get('.btn-delete').trigger('click')

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Globex')
    expect(wrapper.text()).toContain('QA Engineer')
    expect(localStorage.getItem(APPLICATIONS_STORAGE_KEY)).toBe(beforeDelete)
  })
})
