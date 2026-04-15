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
    await wrapper.get('[data-testid="application-modality"]').setValue('Remoto')
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
    await wrapper.get('[data-testid="application-modality"]').setValue('Remoto')
    await wrapper.get('form').trigger('submit.prevent')

    const beforeDelete = localStorage.getItem(APPLICATIONS_STORAGE_KEY)
    expect(beforeDelete).not.toBeNull()

    await wrapper.get('.btn-delete').trigger('click')

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('Globex')
    expect(wrapper.text()).toContain('QA Engineer')
    expect(localStorage.getItem(APPLICATIONS_STORAGE_KEY)).toBe(beforeDelete)
  })

  it('applies combined search, filters and sort deterministically', async () => {
    const wrapper = mount(App)

    await wrapper.get('[data-testid="open-create"]').trigger('click')
    await wrapper.get('#companyName').setValue('Acme Labs')
    await wrapper.get('#jobTitle').setValue('Frontend Engineer')
    await wrapper.get('#status').setValue('Aplicado')
    await wrapper.get('[data-testid="application-modality"]').setValue('Remoto')
    await wrapper.get('#dateApplied').setValue('2026-01-10')
    await wrapper.get('form').trigger('submit.prevent')

    await wrapper.get('[data-testid="open-create"]').trigger('click')
    await wrapper.get('#companyName').setValue('Acme Labs')
    await wrapper.get('#jobTitle').setValue('Frontend Engineer')
    await wrapper.get('#status').setValue('Entrevista Inicial')
    await wrapper.get('[data-testid="application-modality"]').setValue('Remoto')
    await wrapper.get('#dateApplied').setValue('2026-01-10')
    await wrapper.get('form').trigger('submit.prevent')

    await wrapper.get('[data-testid="open-create"]').trigger('click')
    await wrapper.get('#companyName').setValue('ByteWorks')
    await wrapper.get('#jobTitle').setValue('Backend Engineer')
    await wrapper.get('#status').setValue('Oferta')
    await wrapper.get('[data-testid="application-modality"]').setValue('Híbrido')
    await wrapper.get('#workLocation').setValue('Madrid')
    await wrapper.get('#dateApplied').setValue('2026-02-05')
    await wrapper.get('form').trigger('submit.prevent')

    await wrapper.get('[data-testid="search-input"]').setValue('frontend')
    await wrapper.get('[data-testid="modality-filter"]').setValue('Remoto')
    await wrapper.get('[data-testid="status-filter"]').setValue('Entrevista Inicial')
    await wrapper.get('[data-testid="sort-select"]').setValue('status-asc')

    const cards = wrapper.findAll('.job-card')
    expect(cards).toHaveLength(1)
    expect(cards[0].find('.company-name').text()).toBe('Acme Labs')
    expect(cards[0].find('.job-title').text()).toBe('Frontend Engineer')

    await wrapper.get('[data-testid="status-filter"]').setValue('all')
    await wrapper.get('[data-testid="sort-select"]').setValue('status-asc')

    const twoCardsSortedByStatus = wrapper.findAll('.job-card')
    expect(twoCardsSortedByStatus).toHaveLength(2)
    expect(twoCardsSortedByStatus[0].find('.company-name').text()).toBe('Acme Labs')
    expect(twoCardsSortedByStatus[1].find('.company-name').text()).toBe('Acme Labs')

    const storedAppsRaw = localStorage.getItem(APPLICATIONS_STORAGE_KEY)
    expect(storedAppsRaw).not.toBeNull()
    const storedApps = JSON.parse(storedAppsRaw ?? '[]') as Array<{ status: string; dateApplied: string }>
    expect(storedApps).toHaveLength(3)
    expect(storedApps[0].status).toBe('Aplicado')
    expect(storedApps[1].status).toBe('Entrevista Inicial')
  })

  it('shows friendly no-results state when controls yield zero matches', async () => {
    const wrapper = mount(App)

    await wrapper.get('[data-testid="open-create"]').trigger('click')
    await wrapper.get('#companyName').setValue('Globex')
    await wrapper.get('#jobTitle').setValue('QA Engineer')
    await wrapper.get('#status').setValue('Aplicado')
    await wrapper.get('[data-testid="application-modality"]').setValue('Remoto')
    await wrapper.get('form').trigger('submit.prevent')

    await wrapper.get('[data-testid="search-input"]').setValue('NoMatch123')

    expect(wrapper.find('[data-testid="no-results-state"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="no-results-state"]').text()).toContain('Sin resultados')
    expect(wrapper.findComponent({ name: 'KanbanBoard' }).exists()).toBe(false)
    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(false)
  })
})
