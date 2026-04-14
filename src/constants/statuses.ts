export const APPLICATION_STATUSES = [
  'Aplicado',
  'Entrevista Inicial',
  'Prueba Técnica',
  'Oferta',
  'Rechazado',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

const APPLICATION_STATUS_SET = new Set<string>(APPLICATION_STATUSES)

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === 'string' && APPLICATION_STATUS_SET.has(value)
}

export function normalizeApplicationStatus(
  value: unknown,
  fallback: ApplicationStatus = APPLICATION_STATUSES[0],
): ApplicationStatus {
  return isApplicationStatus(value) ? value : fallback
}
