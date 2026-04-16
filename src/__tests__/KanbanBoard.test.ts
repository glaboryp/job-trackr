import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KanbanBoard from '../components/KanbanBoard.vue'
import { APPLICATION_STATUSES } from '../constants/statuses'
import type { Application } from '../types/application'

describe('KanbanBoard', () => {
  it('renders exactly 5 columns with canonical statuses', () => {
    const wrapper = mount(KanbanBoard, {
      props: { applications: [] }
    })
    const columns = wrapper.findAll('.kanban-column')
    expect(columns).toHaveLength(5)
    
    APPLICATION_STATUSES.forEach((status, index) => {
      expect(columns[index].text()).toContain(status)
    })
  })

  it('groups applications by status into correct columns', () => {
    const apps: Application[] = [
      { id: '1', jobTitle: 'Dev', companyName: 'A', modality: 'Remoto', workLocation: '', status: 'Aplicado', dateApplied: '2025-01-01', url: '', notes: '' },
      { id: '2', jobTitle: 'QA', companyName: 'B', modality: 'Híbrido', workLocation: 'Madrid', status: 'Entrevista Inicial', dateApplied: '2025-01-02', url: '', notes: '' },
      { id: '3', jobTitle: 'PM', companyName: 'C', modality: 'Presencial', workLocation: 'Barcelona', status: 'Rechazado', dateApplied: '2025-01-03', url: '', notes: '' }
    ]

    const wrapper = mount(KanbanBoard, {
      props: { applications: apps }
    })
    
    const columns = wrapper.findAll('.kanban-column')
    
    // Aplicado has 1 app
    expect(columns[0].findAll('.kanban-card')).toHaveLength(1)
    expect(columns[0].text()).toContain('Dev')
    
    // Entrevista Inicial has 1 app
    expect(columns[1].findAll('.kanban-card')).toHaveLength(1)
    expect(columns[1].text()).toContain('QA')
    
    // Prueba Técnica has 0 apps
    expect(columns[2].findAll('.kanban-card')).toHaveLength(0)
    
    // Rechazado has 1 app
    expect(columns[4].findAll('.kanban-card')).toHaveLength(1)
    expect(columns[4].text()).toContain('PM')
  })

  it('handles unknown status input safely by applying fallback behavior', () => {
    const apps = [
      { id: '4', jobTitle: 'UX', companyName: 'D', status: 'Unknown Status', dateApplied: '2025-01-04', url: '', notes: '' },
    ] as unknown as Application[]

    const wrapper = mount(KanbanBoard, {
      props: { applications: apps }
    })
    
    const columns = wrapper.findAll('.kanban-column')
    
    // Default fallback is the first status ('Aplicado')
    expect(columns[0].findAll('.kanban-card')).toHaveLength(1)
    expect(columns[0].text()).toContain('UX')
  })

  it('emits events for card actions (edit, delete, move)', async () => {
    const apps: Application[] = [
      { id: '1', jobTitle: 'Dev', companyName: 'A', modality: 'Remoto', workLocation: '', status: 'Aplicado', dateApplied: '2025-01-01', url: '', notes: '' }
    ]

    const wrapper = mount(KanbanBoard, {
      props: { applications: apps }
    })
    
    await wrapper.find('.btn-edit').trigger('click')
    expect(wrapper.emitted('edit')).toBeTruthy()
    expect(wrapper.emitted('edit')![0]).toEqual(['1'])

    await wrapper.find('.btn-delete').trigger('click')
    expect(wrapper.emitted('delete')).toBeTruthy()
    expect(wrapper.emitted('delete')![0]).toEqual(['1'])

    const select = wrapper.find('.status-select')
    await select.setValue('Oferta')
    expect(wrapper.emitted('move')).toBeTruthy()
    expect(wrapper.emitted('move')![0]).toEqual(['1', 'Oferta', 0])
  })

  it('emits move with next index on desktop drop', async () => {
    const apps: Application[] = [
      { id: '1', jobTitle: 'Dev', companyName: 'A', modality: 'Remoto', workLocation: '', status: 'Aplicado', dateApplied: '2025-01-01', url: '', notes: '' },
      { id: '2', jobTitle: 'QA', companyName: 'B', modality: 'Híbrido', workLocation: 'Madrid', status: 'Entrevista Inicial', dateApplied: '2025-01-02', url: '', notes: '' },
      { id: '3', jobTitle: 'PM', companyName: 'C', modality: 'Presencial', workLocation: 'Barcelona', status: 'Entrevista Inicial', dateApplied: '2025-01-03', url: '', notes: '' },
    ]

    const wrapper = mount(KanbanBoard, {
      props: { applications: apps }
    })

    const columns = wrapper.findAll('.kanban-column')
    const targetCards = columns[1].find('.kanban-cards')

    await targetCards.trigger('drop', {
      dataTransfer: {
        getData: (type: string) => (type === 'application/json' ? '{"id":"1"}' : '')
      }
    })

    expect(wrapper.emitted('move')).toBeTruthy()
    expect(wrapper.emitted('move')![0]).toEqual(['1', 'Entrevista Inicial', 2])
  })
})
