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

// Published String fields on the shared building polygon source. Labels are
// supplied by the service; the frontend must not map certificate codes to types.
export const ENERGYMAP_VENTILATION_TYPE_PROPERTY =
  'energy_certificate_ventilation_type_id'
export const ENERGYMAP_VENTILATION_LABEL_PROPERTIES = {
  fi: 'energy_certificate_ventilation_type_label_fi',
  sv: 'energy_certificate_ventilation_type_label_sv',
} as const
export const ENERGYMAP_VENTILATION_DESCRIPTION_PROPERTIES = {
  fi: 'energy_certificate_ventilation_description_fi',
  sv: 'energy_certificate_ventilation_description_sv',
} as const
