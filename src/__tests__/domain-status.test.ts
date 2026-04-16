import { describe, expect, it } from 'vitest'

import {
  APPLICATION_STATUSES,
  isApplicationStatus,
  normalizeApplicationStatus,
  type ApplicationStatus,
} from '../constants/statuses'
import type { Application } from '../types/application'

describe('application domain contract', () => {
  it('exposes canonical statuses in exact order', () => {
    expect(APPLICATION_STATUSES).toEqual([
      'Aplicado',
      'Entrevista Inicial',
      'Prueba Técnica',
      'Oferta',
      'Rechazado',
    ])
  })

  it('normalizes invalid status values safely', () => {
    expect(normalizeApplicationStatus('Pendiente')).toBe('Aplicado')
    expect(normalizeApplicationStatus('Pendiente', 'Oferta')).toBe('Oferta')
  })

  it('validates status candidates correctly', () => {
    expect(isApplicationStatus('Aplicado')).toBe(true)
    expect(isApplicationStatus('Pendiente')).toBe(false)
  })

  it('supports the Application contract fields', () => {
    const status: ApplicationStatus = 'Aplicado'
    const application: Application = {
      id: '1',
      companyName: 'ACME',
      jobTitle: 'Frontend Developer',
      modality: 'Remoto',
      workLocation: '',
      status,
      dateApplied: '2026-04-13',
      url: 'https://example.com/job/1',
      notes: 'Initial screening completed',
    }

    expect(Object.keys(application).sort()).toEqual([
      'companyName',
      'dateApplied',
      'id',
      'jobTitle',
      'modality',
      'notes',
      'status',
      'url',
      'workLocation',
    ])
  })
})
