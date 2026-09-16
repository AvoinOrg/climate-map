export const ENERGYMAP_VENTILATION_CATEGORY_PROPERTY =
  'ventilation_category'

export const ENERGYMAP_VENTILATION_CATEGORY_VALUES = [
  'mechanical',
  'gravity',
  'other',
  'no_info',
] as const

export type EnergymapVentilationCategory =
  (typeof ENERGYMAP_VENTILATION_CATEGORY_VALUES)[number]

const ENERGYMAP_VENTILATION_CATEGORY_SET = new Set<unknown>(
  ENERGYMAP_VENTILATION_CATEGORY_VALUES
)

export const isEnergymapVentilationCategory = (
  value: unknown
): value is EnergymapVentilationCategory =>
  ENERGYMAP_VENTILATION_CATEGORY_SET.has(value)
