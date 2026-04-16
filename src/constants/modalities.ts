export const APPLICATION_MODALITIES = ['Presencial', 'Híbrido', 'Remoto'] as const

export type ApplicationModality = (typeof APPLICATION_MODALITIES)[number]

const APPLICATION_MODALITY_SET = new Set<string>(APPLICATION_MODALITIES)

export function isApplicationModality(value: unknown): value is ApplicationModality {
  return typeof value === 'string' && APPLICATION_MODALITY_SET.has(value)
}

export function normalizeApplicationModality(
  value: unknown,
  fallback: ApplicationModality = 'Remoto',
): ApplicationModality {
  return isApplicationModality(value) ? value : fallback
}
