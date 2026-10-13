import type { ExpressionSpecification } from 'maplibre-gl'
import {
  ENERGY_CERTIFICATE_CLASS_CODES,
  ENERGY_CERTIFICATE_CLASS_COLORS,
  ENERGY_CERTIFICATE_INACTIVE_COLOR,
} from 'applets/energy/layers/energyCertificateLayerConf'
import { HEATING_ENERGY_SOURCE_COLORS } from 'applets/energy/layers/heatingLayerConf'
import { VENTILATION_CATEGORY_COLORS } from 'applets/energy/layers/ventilationLayerConf'
import type { State } from 'applets/energy/state/appletStore'

export type EnergyThemeSelection = Pick<
  State,
  | 'activeThematicMode'
  | 'activeEnergyCertificateClasses'
  | 'heatingSwitchState'
  | 'ventilationSwitchState'
>
export const CLASS_FIELDS = Object.fromEntries(
  ENERGY_CERTIFICATE_CLASS_CODES.map((code) => [
    code,
    `energy_class_${code.toLowerCase()}_count`,
  ])
) as Record<(typeof ENERGY_CERTIFICATE_CLASS_CODES)[number], string>
// Order defines deterministic dominant-category ties, independent of click order.
export const HEATING_FIELDS = {
  geothermal: 'heating_geothermal_count',
  districtHeating: 'heating_district_count',
  electricity: 'heating_electricity_count',
  solar: 'heating_solar_count',
  other: 'heating_other_count',
} as const
export const VENTILATION_FIELDS = {
  mechanical: 'ventilation_mechanical_count',
  gravity: 'ventilation_gravity_count',
  other: 'ventilation_other_count',
  no_info: 'ventilation_no_info_count',
} as const
const classFields = Object.values(CLASS_FIELDS)
const heatingFields = Object.values(HEATING_FIELDS)
const ventilationFields = Object.values(VENTILATION_FIELDS)
const countFields = [
  'building_count',
  ...classFields,
  'energy_class_unknown_count',
  'energy_class_official_count',
  'energy_class_modeled_count',
  ...heatingFields,
  ...ventilationFields,
]
const numeric = (field: string): ExpressionSpecification => [
  'number',
  ['get', field],
  0,
]
const sum = (fields: readonly string[]): ExpressionSpecification => [
  '+',
  0,
  ...fields.map(numeric),
]
const known = sum(classFields)
// Reconciliation is shared by the paint guard and selection guard. Provenance
// describes recognized votes; it is never added to the class denominator.
const reconciliations = [
  {
    fields: [...classFields, 'energy_class_unknown_count'],
    total: ['building_count'],
  },
  {
    fields: ['energy_class_official_count', 'energy_class_modeled_count'],
    total: classFields,
  },
  { fields: heatingFields, total: ['building_count'] },
  { fields: ventilationFields, total: ['building_count'] },
]
const validContract: ExpressionSpecification = [
  'all',
  ['==', ['get', 'thematic_contract_version'], 1],
  ...countFields.map(
    (field): ExpressionSpecification => [
      'all',
      ['==', ['typeof', ['get', field]], 'number'],
      ['>=', numeric(field), 0],
      ['<=', numeric(field), Number.MAX_SAFE_INTEGER],
      ['==', numeric(field), ['floor', numeric(field)]],
    ]
  ),
  ...reconciliations.map(
    ({ fields, total }): ExpressionSpecification => [
      '==',
      sum(fields),
      sum(total),
    ]
  ),
]
const rgb = (hex: string) =>
  hex
    .slice(1)
    .match(/../g)!
    .map((channel) => parseInt(channel, 16))

const selectedCategoryFields = (state: EnergyThemeSelection): string[] => {
  if (state.activeThematicMode === 'heating')
    return Object.entries(HEATING_FIELDS)
      .filter(
        ([key]) => state.heatingSwitchState[key as keyof typeof HEATING_FIELDS]
      )
      .map(([, field]) => field)
  if (state.activeThematicMode === 'ventilation')
    return Object.entries(VENTILATION_FIELDS)
      .filter(
        ([key]) =>
          state.ventilationSwitchState[key as keyof typeof VENTILATION_FIELDS]
      )
      .map(([, field]) => field)
  return []
}

// Class switches neutralize, just like buildings: disabled known classes keep
// their votes using inactive gray. Unknown classes never become G or dilute the
// recognized A–G denominator. Empty/invalid input is deliberately neutral.
// Heating/ventilation instead exclude disabled buckets and choose the dominant
// positive count. Ties choose the first canonical bucket.
export const areaThemeStyle = (
  state: EnergyThemeSelection
): {
  color: ExpressionSpecification | string
  eligibility: ExpressionSpecification
  visible: boolean
} => {
  if (!state.activeThematicMode)
    return {
      color: ENERGY_CERTIFICATE_INACTIVE_COLOR,
      eligibility: ['boolean', false],
      visible: false,
    }
  if (state.activeThematicMode === 'energyCertificates') {
    const channels = ENERGY_CERTIFICATE_CLASS_CODES.map((code) =>
      rgb(
        state.activeEnergyCertificateClasses.includes(code)
          ? ENERGY_CERTIFICATE_CLASS_COLORS[code]
          : ENERGY_CERTIFICATE_INACTIVE_COLOR
      )
    )
    const blended: ExpressionSpecification = [
      'rgb',
      ...[0, 1, 2].map((channel) => [
        '/',
        [
          '+',
          0,
          ...ENERGY_CERTIFICATE_CLASS_CODES.map((code, index) => [
            '*',
            numeric(CLASS_FIELDS[code]),
            channels[index][channel],
          ]),
        ],
        known,
      ]),
    ] as ExpressionSpecification
    return {
      color: [
        'case',
        ['all', validContract, ['>', known, 0]],
        blended,
        ENERGY_CERTIFICATE_INACTIVE_COLOR,
      ],
      eligibility: ['boolean', true],
      visible: true,
    }
  }
  const fields = selectedCategoryFields(state)
  const mapping =
    state.activeThematicMode === 'heating' ? HEATING_FIELDS : VENTILATION_FIELDS
  const palette: Record<string, string> =
    state.activeThematicMode === 'heating'
      ? HEATING_ENERGY_SOURCE_COLORS
      : VENTILATION_CATEGORY_COLORS
  const candidates = Object.entries(mapping).filter(([, field]) =>
    fields.includes(field)
  )
  const stops = candidates.flatMap(([key, field]) => [
    [
      'all',
      ['>', numeric(field), 0],
      ...fields.map((other) => ['>=', numeric(field), numeric(other)]),
    ],
    palette[key],
  ])
  const dominant = stops.length
    ? ['case', ...stops, ENERGY_CERTIFICATE_INACTIVE_COLOR]
    : ENERGY_CERTIFICATE_INACTIVE_COLOR
  return {
    color: [
      'case',
      validContract,
      dominant,
      ENERGY_CERTIFICATE_INACTIVE_COLOR,
    ] as ExpressionSpecification,
    eligibility: fields.length
      ? ['any', ['!', validContract], ['>', sum(fields), 0]]
      : ['boolean', false],
    visible: fields.length > 0,
  }
}

// Same eligibility at the selection boundary, including navigation-created
// identities (which have no tile counts). Actual hits already pass layer filters.
export const isAreaThemeEligible = (
  properties: Record<string, unknown> = {},
  state: EnergyThemeSelection
) => {
  if (!state.activeThematicMode) return false
  if (state.activeThematicMode === 'energyCertificates') return true
  const fields = selectedCategoryFields(state)
  if (!fields.length) return false
  const valid =
    properties.thematic_contract_version === 1 &&
    countFields.every(
      (field) =>
        typeof properties[field] === 'number' &&
        Number.isSafeInteger(properties[field]) &&
        (properties[field] as number) >= 0
    ) &&
    reconciliations.every(({ fields, total }) => {
      const count = (group: readonly string[]) =>
        group.reduce((value, field) => value + (properties[field] as number), 0)
      return count(fields) === count(total)
    })
  return !valid || fields.some((field) => (properties[field] as number) > 0)
}

export const areaThemeSelection = (state: State): EnergyThemeSelection => ({
  activeThematicMode: state.activeThematicMode,
  activeEnergyCertificateClasses: state.activeEnergyCertificateClasses,
  heatingSwitchState: state.heatingSwitchState,
  ventilationSwitchState: state.ventilationSwitchState,
})
