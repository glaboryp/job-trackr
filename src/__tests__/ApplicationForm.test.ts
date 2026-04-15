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
    expect(wrapper.get('[data-testid="form-error-summary"]').text()).toContain('campos obligatorios')
    expect(wrapper.get('#companyName').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('#jobTitle').attributes('aria-invalid')).toBe('true')
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
      modality: 'Presencial',
      workLocation: 'Madrid',
      url: 'https://test.com',
      notes: 'Some notes'
    }
    
    const wrapper = mount(ApplicationForm, {
      props: { initialData }
    })
    
    expect((wrapper.find('#companyName').element as HTMLInputElement).value).toBe('Test Corp')
    expect((wrapper.find('#jobTitle').element as HTMLInputElement).value).toBe('Developer')
    expect((wrapper.find('#status').element as HTMLSelectElement).value).toBe('Prueba Técnica')
    expect((wrapper.find('[data-testid="application-modality"]').element as HTMLSelectElement).value).toBe('Presencial')
    expect((wrapper.find('[data-testid="application-work-location"]').element as HTMLInputElement).value).toBe('Madrid')
  })

  it('emits expected payload and closes on valid submit', async () => {
    const wrapper = mount(ApplicationForm)
    
    await wrapper.find('#companyName').setValue(' New Company ')
    await wrapper.find('#jobTitle').setValue('  Vue Dev ')
    // By default modality is Remoto, so work location is not required.
    
    await wrapper.find('form').trigger('submit.prevent')
    
    const emittedSave = wrapper.emitted('save')
    expect(emittedSave).toBeTruthy()
    
    const payload = emittedSave![0][0] as Omit<Application, 'id'>
    expect(payload.companyName).toBe('New Company')
    expect(payload.jobTitle).toBe('Vue Dev')
    expect(payload.status).toBe(APPLICATION_STATUSES[0])
    expect(payload.modality).toBe('Remoto')
    expect(payload.workLocation).toBe('')
    
    const emittedClose = wrapper.emitted('close')
    expect(emittedClose).toBeTruthy()
  })

  it('blocks submit when modality is Presencial and workLocation is missing', async () => {
    const wrapper = mount(ApplicationForm)
    await wrapper.find('#companyName').setValue('Company')
    await wrapper.find('#jobTitle').setValue('Dev')
    await wrapper.find('[data-testid="application-modality"]').setValue('Presencial')
    await wrapper.find('[data-testid="application-work-location"]').setValue('')
    
    await wrapper.find('form').trigger('submit.prevent')
    
    const errors = wrapper.findAll('.error-msg')
    expect(errors.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('La ubicación es requerida')
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('blocks submit when modality is Híbrido and workLocation is missing', async () => {
    const wrapper = mount(ApplicationForm)
    await wrapper.find('#companyName').setValue('Company')
    await wrapper.find('#jobTitle').setValue('Dev')
    await wrapper.find('[data-testid="application-modality"]').setValue('Híbrido')
    await wrapper.find('[data-testid="application-work-location"]').setValue('  ')
    
    await wrapper.find('form').trigger('submit.prevent')
    
    const errors = wrapper.findAll('.error-msg')
    expect(errors.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('La ubicación es requerida')
    expect(wrapper.emitted('save')).toBeFalsy()
  })

  it('allows submit when modality is Remoto and workLocation is empty', async () => {
    const wrapper = mount(ApplicationForm)
    await wrapper.find('#companyName').setValue('Company')
    await wrapper.find('#jobTitle').setValue('Dev')
    await wrapper.find('[data-testid="application-modality"]').setValue('Remoto')
    await wrapper.find('[data-testid="application-work-location"]').setValue('')
    
    await wrapper.find('form').trigger('submit.prevent')
    
    expect(wrapper.emitted('save')).toBeTruthy()
    const payload = wrapper.emitted('save')![0][0] as Omit<Application, 'id'>
    expect(payload.modality).toBe('Remoto')
    expect(payload.workLocation).toBe('')
  })

  it('links inline error messages with accessible descriptors', async () => {
    const wrapper = mount(ApplicationForm)

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.get('#companyName').attributes('aria-describedby')).toBe('companyName-error')
    expect(wrapper.get('#jobTitle').attributes('aria-describedby')).toBe('jobTitle-error')
    expect(wrapper.get('#companyName-error').attributes('role')).toBe('alert')
    expect(wrapper.get('#jobTitle-error').attributes('role')).toBe('alert')
  })

  it('clears inline errors once required fields are corrected', async () => {
    const wrapper = mount(ApplicationForm)

    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.findAll('.error-msg').length).toBeGreaterThan(0)

    await wrapper.find('#companyName').setValue('Acme Labs')
    await wrapper.find('#jobTitle').setValue('Frontend Engineer')

    expect(wrapper.find('#companyName-error').exists()).toBe(false)
    expect(wrapper.find('#jobTitle-error').exists()).toBe(false)
  })
})
