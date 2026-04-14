import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ApplicationForm from '../components/ApplicationForm.vue'
import { APPLICATION_STATUSES } from '../constants/statuses'
import type { Application } from '../types/application'

describe('ApplicationForm.vue', () => {
  it('blocks empty required fields', async () => {
    const wrapper = mount(ApplicationForm)
    
    await wrapper.find('form').trigger('submit.prevent')
    
    const errors = wrapper.findAll('.error-msg')
    expect(errors.length).toBeGreaterThan(0)
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('blocks whitespace-only required fields', async () => {
    const wrapper = mount(ApplicationForm)
    
    await wrapper.find('#companyName').setValue('   ')
    await wrapper.find('#jobTitle').setValue('   \n ')
    await wrapper.find('form').trigger('submit.prevent')
    
    const errors = wrapper.findAll('.error-msg')
    expect(errors.length).toBeGreaterThan(0)
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('preloads provided values correctly in edit mode', () => {
    const initialData: Application = {
      id: 'app-1',
      companyName: 'Test Corp',
      jobTitle: 'Developer',
      status: 'Prueba Técnica',
      dateApplied: '2023-01-01',
      url: 'https://test.com',
      notes: 'Some notes'
    }
    
    const wrapper = mount(ApplicationForm, {
      props: { initialData }
    })
    
    expect((wrapper.find('#companyName').element as HTMLInputElement).value).toBe('Test Corp')
    expect((wrapper.find('#jobTitle').element as HTMLInputElement).value).toBe('Developer')
    expect((wrapper.find('#status').element as HTMLSelectElement).value).toBe('Prueba Técnica')
  })

  it('emits expected payload and closes on valid submit', async () => {
    const wrapper = mount(ApplicationForm)
    
    await wrapper.find('#companyName').setValue(' New Company ')
    await wrapper.find('#jobTitle').setValue('  Vue Dev ')
    
    await wrapper.find('form').trigger('submit.prevent')
    
    const emittedSave = wrapper.emitted('save')
    expect(emittedSave).toBeTruthy()
    
    const payload = emittedSave![0][0] as Omit<Application, 'id'>
    expect(payload.companyName).toBe('New Company')
    expect(payload.jobTitle).toBe('Vue Dev')
    expect(payload.status).toBe(APPLICATION_STATUSES[0])
    
    const emittedClose = wrapper.emitted('close')
    expect(emittedClose).toBeTruthy()
  })
})
