import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../App.vue'

describe('App', () => {
  it('renders main integration shell', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Job Trackr')
    expect(wrapper.text()).toContain('flujo completo')
    expect(wrapper.get('[data-testid="open-create"]').text()).toContain('Nueva aplicación')
  })

  it('renders empty state when there are no applications', () => {
    const wrapper = mount(App)

    expect(wrapper.findComponent({ name: 'KanbanBoard' }).exists()).toBe(false)

    const emptyState = wrapper.find('[data-testid="empty-state"]')
    expect(emptyState.exists()).toBe(true)
    expect(emptyState.text()).toContain('Ninguna aplicación')

    const cta = wrapper.find('[data-testid="empty-state-cta"]')
    expect(cta.exists()).toBe(true)
    expect(cta.text()).toContain('Crear aplicación')
  })

  it('opens form from empty state CTA and hides empty state after creation', async () => {
    const wrapper = mount(App)

    await wrapper.find('[data-testid="empty-state-cta"]').trigger('click')

    expect(wrapper.findComponent({ name: 'ApplicationForm' }).exists()).toBe(true)

    await wrapper.find('#companyName').setValue('Test Inc')
    await wrapper.find('#jobTitle').setValue('Developer')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'KanbanBoard' }).exists()).toBe(true)
  })
})
