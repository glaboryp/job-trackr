import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JobCard from '../components/JobCard.vue'
import type { Application } from '../types/application'

describe('JobCard.vue', () => {
  const baseApplication: Application = {
    id: '123',
    companyName: 'Acme Corp',
    jobTitle: 'Frontend Developer',
    modality: 'Híbrido',
    workLocation: 'Madrid',
    status: 'Aplicado',
    dateApplied: '2023-10-01',
    url: 'https://example.com/job',
    notes: 'Looking forward to it.'
  }

  it('renders correctly with all provided application fields', () => {
    const wrapper = mount(JobCard, {
      props: { application: baseApplication }
    })

    expect(wrapper.find('.company-name').text()).toBe('Acme Corp')
    expect(wrapper.find('.job-title').text()).toBe('Frontend Developer')
    expect(wrapper.find('.job-modality').text()).toContain('Híbrido')
    expect(wrapper.find('.job-location').text()).toContain('Madrid')
    expect(wrapper.find('.date-applied').text()).toBe('2023-10-01')
    expect(wrapper.find('.notes-text').text()).toBe('Looking forward to it.')
    
    const urlAnchor = wrapper.find('.job-url')
    expect(urlAnchor.exists()).toBe(true)
    expect(urlAnchor.attributes('href')).toBe('https://example.com/job')
  })

  it('handles missing workLocation gracefully', () => {
    const appWithoutLocation = { ...baseApplication, workLocation: '' }
    const wrapper = mount(JobCard, {
      props: { application: appWithoutLocation }
    })

    expect(wrapper.find('.job-location').text()).toBe('Ubicación no especificada')
  })

  it('handles empty notes without layout/runtime break', () => {
    const appWithoutNotes = { ...baseApplication, notes: '' }
    const wrapper = mount(JobCard, {
      props: { application: appWithoutNotes }
    })

    expect(wrapper.find('.notes-text').exists()).toBe(false)
    expect(wrapper.find('.notes-empty').text()).toBe('Sin notas')
  })

  it('renders safe URL for malformed or unsafe inputs', () => {
    const appWithBadUrl = { ...baseApplication, url: 'javascript:alert(1)' }
    const wrapper = mount(JobCard, {
      props: { application: appWithBadUrl }
    })

    const urlAnchor = wrapper.find('.job-url')
    expect(urlAnchor.exists()).toBe(true)
    expect(urlAnchor.attributes('href')).toBe('#')
  })

  it('emits "edit" event with Application payload when edit button is clicked', async () => {
    const wrapper = mount(JobCard, {
      props: { application: baseApplication }
    })

    await wrapper.find('.btn-edit').trigger('click')

    expect(wrapper.emitted('edit')).toBeTruthy()
    expect(wrapper.emitted('edit')![0]).toEqual([baseApplication])
  })

  it('emits "delete" event with correct id when delete button is clicked', async () => {
    const wrapper = mount(JobCard, {
      props: { application: baseApplication }
    })

    await wrapper.find('.btn-delete').trigger('click')

    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0]).toEqual(['123'])
  })

  it('adds native desktop DnD attributes and emits "dragstart"', async () => {
    const wrapper = mount(JobCard, {
      props: { application: baseApplication }
    })

    const card = wrapper.find('.job-card')
    expect(card.attributes('draggable')).toBe('true')

    await card.trigger('dragstart')
    
    expect(wrapper.emitted('dragstart')).toBeTruthy()
    const emittedEvent = wrapper.emitted('dragstart')![0]
    expect(emittedEvent[0]).toBeInstanceOf(Event)
    expect(emittedEvent[1]).toBe('123')
  })

  it('mobile-visible status selector emits change event for status updates', async () => {
    const wrapper = mount(JobCard, {
      props: { application: baseApplication }
    })

    const select = wrapper.find('select.status-select')
    expect(select.exists()).toBe(true)
    
    await select.setValue('Entrevista Inicial')

    expect(wrapper.emitted('update-status')).toBeTruthy()
    expect(wrapper.emitted('update-status')![0]).toEqual(['123', 'Entrevista Inicial'])
  })
})
