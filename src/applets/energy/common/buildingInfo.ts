import {
  HEATING_METHOD_CODES,
  HEATING_ENERGY_SOURCE_CODES,
} from 'applets/energy/common/buildingCodes'
import {
  collectMissingBuildingInfo,
  type BuildingInfoMissingReason,
  type BuildingInfoFieldResolution,
} from './buildingInfoMissingData'
import {
  getStringProperty,
  getEnergyReferenceCoverageExclusions,
  getCodeProperty,
  getPositiveNumberProperty,
  getEnergyNumberProperty,
  formatCalendarDate,
  formatYearFromDate,
  getOpaqueIdentifier,
  isUsableProduct,
  isUsableEnergyIntensity,
} from './buildingInfoEvidence'
export { formatCalendarDate, formatYearFromDate } from './buildingInfoEvidence'
import { ENERGY_CERTIFICATE_CLASS_CODES } from '../layers/energyCertificateLayerConf'
import {
  ENERGYMAP_BUILDING_COMPLETION_DATE_PROPERTY,
  ENERGYMAP_BUILDING_TYPE_CODES,
  ENERGYMAP_BUILDING_TYPE_PROPERTY,
} from '../layers/buildingPolygonsLayerConf'
import { HEATING_ENERGY_SOURCE_PROPERTY } from '../layers/heatingLayerConf'
import type { EnergyCertificateClassCode } from '../layers/energyCertificateLayerConf'
import {
  calculateCurrentReferenceAnnualWater,
  calculateCurrentReferenceAnnualCo2,
  calculateCurrentReferenceAnnualCost,
  deriveCurrentReferenceResidentCount,
} from './currentReferenceCalculations'
import type {
  CurrentReferenceAnnualCo2Result,
  CurrentReferenceAnnualCostResult,
  CurrentReferenceEnergyInput,
  CurrentReferenceUnsupportedReason,
  CurrentReferenceUnsupportedResult,
} from './currentReferenceCalculations'
import { CURRENT_REFERENCE_DATA } from './currentReferenceData'
import {
  ENERGYMAP_DERIVED_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS,
  ENERGYMAP_DERIVED_WATER_PROVENANCE_INPUT_IDS,
  ENERGYMAP_BUILDING_INFO_CERTIFICATE_COMPONENT_PROVENANCE,
  ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS,
  ENERGYMAP_BUILDING_INFO_CERTIFICATE_PROVENANCE_IDS,
  ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS,
  ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS,
  getEnergymapCurrentReferenceProvenanceInputIds,
  getEnergymapModeledClassProvenanceEvidence,
  getEnergymapModelOutputProvenanceInputId,
} from './buildingInfoProvenance'
import type {
  EnergymapBuildingInfoProvenanceInputId,
  EnergymapBuildingInfoProvenanceId,
  EnergymapBuildingInfoProvenanceRef,
  EnergymapBuildingInfoProvenanceRuntimeValue,
} from './buildingInfoProvenance'
import {
  ENERGY_CERTIFICATE_CONSUMPTION_PROPERTY,
  parseEnergyCertificateConsumptionOutcome,
} from './energyCertificateConsumption'
import type {
  EnergyCertificateConsumptionComponent,
  EnergyCertificateConsumptionRecord,
  EnergyCertificateConsumptionStandardCarrier,
} from './energyCertificateConsumption'
import type { EnergymapSelectedBuilding } from './types'
import {
  ENERGYMAP_VENTILATION_CATEGORY_PROPERTY,
  ENERGYMAP_VENTILATION_DESCRIPTION_PROPERTIES,
  ENERGYMAP_VENTILATION_LABEL_PROPERTIES,
  ENERGYMAP_VENTILATION_TYPE_PROPERTY,
  isEnergymapVentilationCategory,
} from 'applets/energy/common/ventilation'

export type EnergymapBuildingInfoPanelId =
  | 'energyConsumption'
  | 'renovationRecommendations'
  | 'buildingDetails'

export type EnergymapBuildingInfoValueStatus =
  | 'real'
  | 'estimate'
  | 'missing'
  | 'placeholder'

export type EnergymapBuildingInfoTextParam = string | number

export type EnergymapBuildingInfoText =
  | {
      type: 'translation'
      keyName: string
      params?: Record<string, EnergymapBuildingInfoTextParam>
    }
  | {
      type: 'plain'
      text: string
    }
  | {
      type: 'sequence'
      parts: EnergymapBuildingInfoText[]
      separator: string
    }

export type EnergymapBuildingInfoValueNote = EnergymapBuildingInfoText & {
  sourceProperties?: string[]
  provenance?: EnergymapBuildingInfoProvenanceRef
}

export type EnergymapBuildingInfoValue = {
  amount?: number
  denominator?: {
    id: 'registryFloorArea' | 'certificateHeatedNetArea'
    areaM2: number
  }
  text: EnergymapBuildingInfoText
  status: EnergymapBuildingInfoValueStatus
  sourceProperties?: string[]
  sourceLanguage?: 'fi' | 'sv'
  provenance?: EnergymapBuildingInfoProvenanceRef
  unitKey?: string
  note?: EnergymapBuildingInfoValueNote
}

export type EnergymapBuildingInfoRow = EnergymapBuildingInfoValue & {
  id: string
  label: EnergymapBuildingInfoText
  presentation?: 'expandableSourceText'
  modeledIndicator?: {
    label: EnergymapBuildingInfoText
    tooltip: EnergymapBuildingInfoText
    ariaLabelKey: string
    sourceProperties: string[]
    provenance?: EnergymapBuildingInfoProvenanceRef
  }
}

export type EnergymapBuildingInfoMetricValue = EnergymapBuildingInfoValue & {
  id: 'annualTotal' | 'perSquareMeter' | 'savingsPercent'
  label: EnergymapBuildingInfoText
}

export type EnergymapBuildingInfoMetricId =
  | 'total'
  | 'heating'
  | 'electricity'
  | 'waterHeating'
  | 'purchasedElectricity'
  | 'districtHeat'
  | 'districtCooling'
  | 'fossilFuel'
  | 'renewableFuel'
  | 'other0'
  | 'other1'
  | 'other2'

export type EnergymapBuildingInfoEnergyBasis = {
  id: 'registryFloorArea' | 'certificateHeatedNetArea'
  label: EnergymapBuildingInfoText
  values: EnergymapBuildingInfoMetricValue[]
}

export type EnergymapBuildingInfoMetric = {
  id: EnergymapBuildingInfoMetricId
  label: EnergymapBuildingInfoText
  labelSourceProperties?: string[]
  labelProvenance?: EnergymapBuildingInfoProvenanceRef
  values: EnergymapBuildingInfoMetricValue[]
  /** Coherent conversion families; never splice numerators or area definitions. */
  bases?: EnergymapBuildingInfoEnergyBasis[]
  coverage?: {
    kind: 'endUse' | 'carrier' | 'total'
    complete: boolean
    contributors?: EnergymapBuildingInfoMetricId[]
  }
}

export type EnergymapBuildingInfoPrimaryMetricId =
  | 'energy'
  | 'water'
  | 'cost'
  | 'co2'

export type EnergymapBuildingInfoEnergySubmetricId =
  EnergymapBuildingInfoMetricId

export type EnergymapBuildingInfoPrimaryMetric = {
  id: EnergymapBuildingInfoPrimaryMetricId
  label: EnergymapBuildingInfoText
  ariaLabelKey: string
  supported: boolean
  value?: EnergymapBuildingInfoValue
  unavailableNote?: EnergymapBuildingInfoNote
  residentCountControl?: EnergymapBuildingInfoResidentCountControl
  calculationFailure?: CurrentReferenceUnsupportedResult
}

export type EnergymapBuildingInfoResidentCountControl = {
  defaultValue: number | null
  /** Retained to explain a failed default while allowing a manual count. */
  defaultFloorArea?: unknown
  minValue: number
  maxValue: number
  label: EnergymapBuildingInfoText
  toggleLabel: EnergymapBuildingInfoText
  description: EnergymapBuildingInfoText
  unavailableText: EnergymapBuildingInfoText
  sourceProperties?: string[]
  provenance?: EnergymapBuildingInfoProvenanceRef
}

export type EnergymapBuildingInfoEnergySubmetric = {
  id: EnergymapBuildingInfoEnergySubmetricId
  label: EnergymapBuildingInfoText
  ariaLabelKey?: string
  ariaLabel?: string
  supported: boolean
  defaultSelected: boolean
  metric: EnergymapBuildingInfoMetric
  unavailableNote?: EnergymapBuildingInfoNote
}

export type EnergymapBuildingInfoConsumptionControls = {
  defaultPrimaryMetricId: EnergymapBuildingInfoPrimaryMetricId
  primaryMetrics: EnergymapBuildingInfoPrimaryMetric[]
  defaultEnergySubmetricIds?: EnergymapBuildingInfoEnergySubmetricId[]
  energySubmetrics?: EnergymapBuildingInfoEnergySubmetric[]
  combinedEnergyMetric?: EnergymapBuildingInfoMetric
  /** @deprecated Kept as an optional compatibility field for authored fixtures. */
  emptyEnergyMetric?: EnergymapBuildingInfoMetric
}

export type EnergymapBuildingInfoEnergySelection = {
  primaryMetricId: EnergymapBuildingInfoPrimaryMetricId
  selectedSubmetricIds: readonly EnergymapBuildingInfoEnergySubmetricId[]
  basisId?: EnergymapBuildingInfoEnergyBasis['id']
}

export type EnergymapBuildingInfoSelectedEnergyConsumption = {
  values: EnergymapBuildingInfoMetricValue[]
  notes: EnergymapBuildingInfoNote[]
  metric?: EnergymapBuildingInfoMetric
  basisId?: EnergymapBuildingInfoEnergyBasis['id']
}

export type EnergymapBuildingInfoScenario = {
  id: EnergymapEnergyMeasure
  label: EnergymapBuildingInfoText
  values: EnergymapBuildingInfoMetricValue[]
}

export type EnergymapBuildingInfoNote = {
  id: string
  text: EnergymapBuildingInfoText
  status: EnergymapBuildingInfoValueStatus
  sourceProperties?: string[]
  provenance?: EnergymapBuildingInfoProvenanceRef
}

export type EnergymapBuildingInfoSectionVariant =
  | 'default'
  | 'buildingSubheader'
  | 'energyCertificate'
  | 'previousEnergyClass'
  | 'measureList'

export type EnergymapBuildingInfoSection = {
  id: string
  variant?: EnergymapBuildingInfoSectionVariant
  title?: EnergymapBuildingInfoText
  titleSourceProperties?: string[]
  titleProvenance?: EnergymapBuildingInfoProvenanceRef
  description?: EnergymapBuildingInfoText
  rows?: EnergymapBuildingInfoRow[]
  metrics?: EnergymapBuildingInfoMetric[]
  consumptionControls?: EnergymapBuildingInfoConsumptionControls
  scenarios?: EnergymapBuildingInfoScenario[]
  notes?: EnergymapBuildingInfoNote[]
}

export type EnergymapBuildingInfoPanel = {
  id: EnergymapBuildingInfoPanelId
  title: EnergymapBuildingInfoText
  description?: EnergymapBuildingInfoText
  sections: EnergymapBuildingInfoSection[]
}

export type EnergymapBuildingInfoMissingItem = {
  id: string
  panelId: EnergymapBuildingInfoPanelId
  label: EnergymapBuildingInfoText
  reason: EnergymapBuildingInfoText
  evidence: BuildingInfoMissingReason
}

export type EnergymapBuildingInfoMissingData = {
  locale: string
  items: EnergymapBuildingInfoMissingItem[]
  inventory?: BuildingInfoFieldResolution[]
}

export type EnergymapBuildingInfoPresentation = {
  panels: EnergymapBuildingInfoPanel[] | null
  missingData: EnergymapBuildingInfoMissingData | null
}

export type EnergymapEnergyScenarioPrefix =
  | 'awhp'
  | 'delec'
  | 'distr'
  | 'elecb'
  | 'gshp'
  | 'oil'
  | 'wood'

export type EnergymapEnergyMeasure = 'default' | 'aahp' | 'solar' | 'windows'

export type EnergymapEnergyEstimateType = 'total' | 'heat' | 'elec'

export type CreateEnergymapBuildingInfoPanelsOptions = {
  selectedBuilding: EnergymapSelectedBuilding | null
  locale: string
}

const TRANSLATION_PREFIX = 'sidebar.building_info'
const HEATING_METHOD_PROPERTY = 'heating_method'
const FLOOR_AREA_PROPERTY = 'floor_area'
const TOTAL_AREA_PROPERTY = 'total_area'
const GROSS_FLOOR_AREA_PROPERTY = 'gross_floor_area'
const NUMBER_OF_STOREYS_PROPERTY = 'number_of_storeys'
const MODELED_ENERGY_CLASS_AREA_SOURCE_PROPERTY =
  'modeled_energy_class_area_source'
const PERMANENT_BUILDING_IDENTIFIER_PROPERTY = 'permanent_building_identifier'
const ADDRESS_FIN_PROPERTY = 'address_fin'
const POSTAL_CODE_PROPERTY = 'postal_code'
const POSTAL_OFFICE_FIN_PROPERTY = 'postal_office_fin'
const ENERGY_CERTIFICATE_HEATED_NET_AREA_PROPERTY =
  'energy_certificate_heated_net_area'
const ENERGY_CERTIFICATE_VALID_UNTIL_PROPERTY = 'energy_certificate_valid_until'
const ENERGY_CERTIFICATE_PREVIOUS_CLASS_PROPERTY =
  'energy_certificate_previous_class'
const ENERGY_CLASS_PROPERTY = 'energy_class'
const IS_ENERGY_CLASS_MODELED_PROPERTY = 'is_energy_class_modeled'
type EnergyClassProperty =
  | typeof ENERGY_CLASS_PROPERTY
  | typeof ENERGY_CERTIFICATE_PREVIOUS_CLASS_PROPERTY
const ENERGY_CERTIFICATE_RECOMMENDATIONS_FI_PROPERTY =
  'energy_certificate_recommendations_fi'
const ENERGY_CERTIFICATE_RECOMMENDATIONS_SV_PROPERTY =
  'energy_certificate_recommendations_sv'
const ENERGY_CERTIFICATE_RECOMMENDATIONS_PROPERTIES = {
  fi: ENERGY_CERTIFICATE_RECOMMENDATIONS_FI_PROPERTY,
  sv: ENERGY_CERTIFICATE_RECOMMENDATIONS_SV_PROPERTY,
} as const
// Energy supports Finnish and English UI locales. Neither UI locale has an
// English source, so both use Finnish first and Swedish only as a fallback.
const ENERGY_CERTIFICATE_RECOMMENDATIONS_SOURCE_ORDER = ['fi', 'sv'] as const

const CURRENT_ENERGY_PROVENANCE_IDS = {
  total: {
    annualTotal: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_TOTAL_ANNUAL,
    perSquareMeter:
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_TOTAL_PER_SQUARE_METER,
  },
  heat: {
    annualTotal: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_HEATING_ANNUAL,
    perSquareMeter:
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_HEATING_PER_SQUARE_METER,
  },
  elec: {
    annualTotal:
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_ELECTRICITY_ANNUAL,
    perSquareMeter:
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_ELECTRICITY_PER_SQUARE_METER,
  },
} as const satisfies Record<
  EnergymapEnergyEstimateType,
  Record<'annualTotal' | 'perSquareMeter', EnergymapBuildingInfoProvenanceId>
>

const RENOVATION_SCENARIO_PROVENANCE_IDS = {
  aahp: {
    annualTotal: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.SCENARIO_AAHP_ANNUAL,
    perSquareMeter:
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.SCENARIO_AAHP_PER_SQUARE_METER,
    savingsPercent:
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.SCENARIO_AAHP_SAVINGS,
  },
  solar: {
    annualTotal: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.SCENARIO_SOLAR_ANNUAL,
    perSquareMeter:
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.SCENARIO_SOLAR_PER_SQUARE_METER,
    savingsPercent:
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.SCENARIO_SOLAR_SAVINGS,
  },
  windows: {
    annualTotal: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.SCENARIO_WINDOWS_ANNUAL,
    perSquareMeter:
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.SCENARIO_WINDOWS_PER_SQUARE_METER,
    savingsPercent:
      ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.SCENARIO_WINDOWS_SAVINGS,
  },
} as const satisfies Record<
  Exclude<EnergymapEnergyMeasure, 'default'>,
  Record<
    'annualTotal' | 'perSquareMeter' | 'savingsPercent',
    EnergymapBuildingInfoProvenanceId
  >
>

const translationText = (
  keyName: string,
  params?: Record<string, EnergymapBuildingInfoTextParam>
): EnergymapBuildingInfoText => ({
  type: 'translation',
  keyName,
  ...(params == null ? {} : { params }),
})

const plainText = (text: string): EnergymapBuildingInfoText => ({
  type: 'plain',
  text,
})

const sequenceText = (
  parts: EnergymapBuildingInfoText[],
  separator = ', '
): EnergymapBuildingInfoText => ({
  type: 'sequence',
  parts,
  separator,
})

const key = (suffix: string) => `${TRANSLATION_PREFIX}.${suffix}`

const placeholderValue = ({
  keyName,
  sourceProperties,
}: {
  keyName: string
  sourceProperties?: string[]
}): EnergymapBuildingInfoValue => ({
  text: translationText(keyName),
  status: 'placeholder',
  ...(sourceProperties == null ? {} : { sourceProperties }),
})

const missingValue = ({
  keyName = key('placeholders.missing_value'),
  sourceProperties,
}: {
  keyName?: string
  sourceProperties?: string[]
} = {}): EnergymapBuildingInfoValue => ({
  text: translationText(keyName),
  status: 'missing',
  ...(sourceProperties == null ? {} : { sourceProperties }),
})

const realValue = ({
  text,
  sourceProperties,
  sourceLanguage,
  provenance,
  unitKey,
  note,
}: {
  text: EnergymapBuildingInfoText
  sourceProperties: string[]
  sourceLanguage?: 'fi' | 'sv'
  provenance?: EnergymapBuildingInfoProvenanceRef
  unitKey?: string
  note?: EnergymapBuildingInfoText
}): EnergymapBuildingInfoValue => ({
  text,
  status: 'real',
  sourceProperties,
  ...(sourceLanguage == null ? {} : { sourceLanguage }),
  ...(provenance == null ? {} : { provenance }),
  ...(unitKey == null ? {} : { unitKey }),
  ...(note == null ? {} : { note }),
})

const estimateValue = ({
  text,
  amount,
  denominator,
  sourceProperties,
  provenance,
  unitKey,
  note,
}: {
  text: EnergymapBuildingInfoText
  amount?: number
  denominator?: EnergymapBuildingInfoValue['denominator']
  sourceProperties: string[]
  provenance?: EnergymapBuildingInfoProvenanceRef
  unitKey?: string
  note?: EnergymapBuildingInfoValueNote
}): EnergymapBuildingInfoValue => ({
  text,
  status: 'estimate',
  ...(amount == null ? {} : { amount }),
  ...(denominator == null ? {} : { denominator }),
  sourceProperties,
  ...(provenance == null ? {} : { provenance }),
  ...(unitKey == null ? {} : { unitKey }),
  ...(note == null ? {} : { note }),
})

const row = ({
  id,
  labelKey,
  value,
  presentation,
  modeledIndicator,
}: {
  id: string
  labelKey: string
  value: EnergymapBuildingInfoValue
  presentation?: EnergymapBuildingInfoRow['presentation']
  modeledIndicator?: EnergymapBuildingInfoRow['modeledIndicator']
}): EnergymapBuildingInfoRow => ({
  id,
  label: translationText(labelKey),
  ...value,
  ...(presentation == null ? {} : { presentation }),
  ...(modeledIndicator == null ? {} : { modeledIndicator }),
})

const metricValue = ({
  id,
  labelKey,
  value,
}: {
  id: EnergymapBuildingInfoMetricValue['id']
  labelKey: string
  value: EnergymapBuildingInfoValue
}): EnergymapBuildingInfoMetricValue => ({
  id,
  label: translationText(labelKey),
  ...value,
})

const note = ({
  id,
  keyName,
  status,
  sourceProperties,
  provenance,
}: {
  id: string
  keyName: string
  status: EnergymapBuildingInfoValueStatus
  sourceProperties?: string[]
  provenance?: EnergymapBuildingInfoProvenanceRef
}): EnergymapBuildingInfoNote => ({
  id,
  text: translationText(keyName),
  status,
  ...(sourceProperties == null ? {} : { sourceProperties }),
  ...(provenance == null ? {} : { provenance }),
})

export const normalizeEnergymapBuildingInfoText = (
  text: EnergymapBuildingInfoText | null | undefined
): EnergymapBuildingInfoText | null => {
  if (text == null) {
    return null
  }

  if (text.type === 'plain') {
    return text.text.trim() === '' ? null : text
  }

  if (text.type === 'translation') {
    return text.keyName.trim() === '' ? null : text
  }

  const parts = text.parts
    .map(normalizeEnergymapBuildingInfoText)
    .filter((part): part is EnergymapBuildingInfoText => part != null)

  if (parts.length === 0) {
    return null
  }

  return parts.length === text.parts.length &&
    parts.every((part, index) => part === text.parts[index])
    ? text
    : { ...text, parts }
}

const getAvailableValueText = (
  value: EnergymapBuildingInfoValue | null | undefined
): EnergymapBuildingInfoText | null => {
  if (
    value == null ||
    (value.status !== 'real' && value.status !== 'estimate')
  ) {
    return null
  }

  return normalizeEnergymapBuildingInfoText(value.text)
}

export const isEnergymapBuildingInfoValueAvailable = (
  value: EnergymapBuildingInfoValue | null | undefined
): value is EnergymapBuildingInfoValue & {
  status: Extract<EnergymapBuildingInfoValueStatus, 'real' | 'estimate'>
} => getAvailableValueText(value) != null

const normalizeValue = <Value extends EnergymapBuildingInfoValue>(
  value: Value | null | undefined
): Value | null => {
  const text = getAvailableValueText(value)
  if (value == null || text == null) {
    return null
  }

  const normalizedNoteText = normalizeEnergymapBuildingInfoText(value.note)
  const normalizedNote =
    value.note == null || normalizedNoteText == null
      ? null
      : ({
          ...value.note,
          ...normalizedNoteText,
        } as EnergymapBuildingInfoValueNote)
  const { note: _note, ...valueWithoutNote } = value

  return {
    ...valueWithoutNote,
    text,
    ...(normalizedNote == null ? {} : { note: normalizedNote }),
  } as Value
}

const normalizeRow = (
  candidate: EnergymapBuildingInfoRow
): EnergymapBuildingInfoRow | null => {
  const value = normalizeValue(candidate)
  const label = normalizeEnergymapBuildingInfoText(candidate.label)

  if (value == null || label == null) {
    return null
  }

  const modeledLabel = normalizeEnergymapBuildingInfoText(
    value.modeledIndicator?.label
  )
  const modeledTooltip = normalizeEnergymapBuildingInfoText(
    value.modeledIndicator?.tooltip
  )
  const modeledIndicator =
    value.modeledIndicator != null &&
    modeledLabel != null &&
    modeledTooltip != null &&
    value.modeledIndicator.ariaLabelKey.trim() !== ''
      ? {
          ...value.modeledIndicator,
          label: modeledLabel,
          tooltip: modeledTooltip,
        }
      : null
  const { modeledIndicator: _modeledIndicator, ...valueWithoutIndicator } =
    value

  return {
    ...valueWithoutIndicator,
    label,
    ...(modeledIndicator == null ? {} : { modeledIndicator }),
  }
}

const normalizeMetricValue = (
  candidate: EnergymapBuildingInfoMetricValue
): EnergymapBuildingInfoMetricValue | null => {
  const value = normalizeValue(candidate)
  const label = normalizeEnergymapBuildingInfoText(candidate.label)

  return value == null || label == null ? null : { ...value, label }
}

const normalizeMetric = (
  candidate: EnergymapBuildingInfoMetric | null | undefined
): EnergymapBuildingInfoMetric | null => {
  if (candidate == null) {
    return null
  }

  const label = normalizeEnergymapBuildingInfoText(candidate.label)
  const values = candidate.values
    .map(normalizeMetricValue)
    .filter((value): value is EnergymapBuildingInfoMetricValue => value != null)

  return label == null || values.length === 0
    ? null
    : { ...candidate, label, values }
}

const normalizeScenario = (
  candidate: EnergymapBuildingInfoScenario
): EnergymapBuildingInfoScenario | null => {
  const label = normalizeEnergymapBuildingInfoText(candidate.label)
  const values = candidate.values
    .map(normalizeMetricValue)
    .filter((value): value is EnergymapBuildingInfoMetricValue => value != null)

  return label == null || values.length === 0
    ? null
    : { ...candidate, label, values }
}

const normalizeNote = (
  candidate: EnergymapBuildingInfoNote
): EnergymapBuildingInfoNote | null => {
  if (candidate.status !== 'real' && candidate.status !== 'estimate') {
    return null
  }

  const text = normalizeEnergymapBuildingInfoText(candidate.text)
  return text == null ? null : { ...candidate, text }
}

const formatNumber = ({
  value,
  locale,
  maximumFractionDigits = 0,
  minimumFractionDigits = 0,
}: {
  value: number
  locale: string
  maximumFractionDigits?: number
  minimumFractionDigits?: number
}) =>
  new Intl.NumberFormat(locale, {
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(value)

export const composeEnergymapBuildingAddress = (
  properties: EnergymapSelectedBuilding['properties']
): string | null => {
  const address = getStringProperty(properties, ADDRESS_FIN_PROPERTY)
  const postalCode = getStringProperty(properties, POSTAL_CODE_PROPERTY)
  const postalOffice = getStringProperty(properties, POSTAL_OFFICE_FIN_PROPERTY)
  const postalAddress = [postalCode, postalOffice].filter(Boolean).join(' ')

  if (address == null && postalAddress === '') {
    return null
  }

  if (address == null) {
    return postalAddress
  }

  if (postalAddress === '') {
    return address
  }

  return `${address}, ${postalAddress}`
}

export const resolveCurrentEnergyScenarioPrefix = ({
  heatingEnergySource,
  heatingMethod,
}: {
  heatingEnergySource: string | null
  heatingMethod: string | null
}): EnergymapEnergyScenarioPrefix | null => {
  if (heatingEnergySource === '01') {
    return 'distr'
  }

  if (heatingEnergySource === '02') {
    return 'oil'
  }

  if (heatingEnergySource === '07') {
    return 'wood'
  }

  if (heatingEnergySource === '09') {
    return 'gshp'
  }

  if (heatingEnergySource === '04' && heatingMethod === '01') {
    return 'elecb'
  }

  if (heatingEnergySource === '04' && heatingMethod === '03') {
    return 'delec'
  }

  return null
}

const getScenarioProperty = ({
  prefix,
  measure,
  estimateType,
}: {
  prefix: EnergymapEnergyScenarioPrefix
  measure: EnergymapEnergyMeasure
  estimateType: EnergymapEnergyEstimateType
}) => `${prefix}_${measure}_${estimateType}`

const getUnsupportedEstimateValue = (sourceProperties: string[]) =>
  missingValue({
    keyName: key('placeholders.unsupported_energy_estimate'),
    sourceProperties,
  })

const getEnergyEstimateProvenance = ({
  id,
  prefix,
  measure,
  estimateType,
  annual,
}: {
  id: EnergymapBuildingInfoProvenanceId
  prefix: EnergymapEnergyScenarioPrefix
  measure: EnergymapEnergyMeasure
  estimateType: EnergymapEnergyEstimateType
  annual: boolean
}): EnergymapBuildingInfoProvenanceRef | undefined => {
  const modelOutputInputId = getEnergymapModelOutputProvenanceInputId({
    prefix,
    measure,
    estimateType,
  })

  return modelOutputInputId == null
    ? undefined
    : {
        id,
        inputIds: [
          modelOutputInputId,
          ...(annual
            ? [
                ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_FLOOR_AREA,
                ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.INTENSITY_TIMES_AREA,
              ]
            : []),
        ],
      }
}

const getEstimatedValueNote = ({
  valueProvenance,
  sourceProperties,
}: {
  valueProvenance: EnergymapBuildingInfoProvenanceRef | undefined
  sourceProperties: string[]
}): EnergymapBuildingInfoValueNote => ({
  ...translationText(key('panels.energy.note.estimated')),
  sourceProperties,
  ...(valueProvenance == null
    ? {}
    : {
        provenance: {
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ESTIMATED_VALUE_NOTE,
          inputIds: valueProvenance.inputIds,
        },
      }),
})

const getPerSquareMeterEstimateValue = ({
  properties,
  prefix,
  measure,
  estimateType,
  provenanceId,
  locale,
}: {
  properties: EnergymapSelectedBuilding['properties']
  prefix: EnergymapEnergyScenarioPrefix | null
  measure: EnergymapEnergyMeasure
  estimateType: EnergymapEnergyEstimateType
  provenanceId: EnergymapBuildingInfoProvenanceId
  locale: string
}): EnergymapBuildingInfoValue => {
  if (prefix == null) {
    return getUnsupportedEstimateValue([
      HEATING_METHOD_PROPERTY,
      HEATING_ENERGY_SOURCE_PROPERTY,
    ])
  }

  const sourceProperty = getScenarioProperty({
    prefix,
    measure,
    estimateType,
  })

  if (
    getEnergyReferenceCoverageExclusions({
      purpose: getCodeProperty(properties, ENERGYMAP_BUILDING_TYPE_PROPERTY),
      prefix,
      measure,
    }).length > 0
  ) {
    return placeholderValue({
      keyName: key('placeholders.not_published'),
      sourceProperties: [sourceProperty],
    })
  }

  const perSquareMeterValue = getEnergyNumberProperty(
    properties,
    sourceProperty
  )

  if (perSquareMeterValue == null) {
    return missingValue({ sourceProperties: [sourceProperty] })
  }

  const provenance = getEnergyEstimateProvenance({
    id: provenanceId,
    prefix,
    measure,
    estimateType,
    annual: false,
  })

  return estimateValue({
    amount: perSquareMeterValue,
    ...(getPositiveNumberProperty(properties, FLOOR_AREA_PROPERTY) == null
      ? {}
      : {
          denominator: {
            id: 'registryFloorArea',
            areaM2: getPositiveNumberProperty(properties, FLOOR_AREA_PROPERTY)!,
          } as const,
        }),
    text: plainText(
      formatNumber({
        value: perSquareMeterValue,
        locale,
        maximumFractionDigits: 1,
      })
    ),
    unitKey: key('units.kwh_per_square_meter_year'),
    sourceProperties: [sourceProperty],
    provenance,
    note: getEstimatedValueNote({
      valueProvenance: provenance,
      sourceProperties: [sourceProperty],
    }),
  })
}

const getAnnualEstimateValue = ({
  properties,
  prefix,
  measure,
  estimateType,
  provenanceId,
  locale,
}: {
  properties: EnergymapSelectedBuilding['properties']
  prefix: EnergymapEnergyScenarioPrefix | null
  measure: EnergymapEnergyMeasure
  estimateType: EnergymapEnergyEstimateType
  provenanceId: EnergymapBuildingInfoProvenanceId
  locale: string
}): EnergymapBuildingInfoValue => {
  if (prefix == null) {
    return getUnsupportedEstimateValue([
      HEATING_METHOD_PROPERTY,
      HEATING_ENERGY_SOURCE_PROPERTY,
    ])
  }

  const sourceProperty = getScenarioProperty({
    prefix,
    measure,
    estimateType,
  })

  if (
    getEnergyReferenceCoverageExclusions({
      purpose: getCodeProperty(properties, ENERGYMAP_BUILDING_TYPE_PROPERTY),
      prefix,
      measure,
    }).length > 0
  ) {
    return placeholderValue({
      keyName: key('placeholders.not_published'),
      sourceProperties: [sourceProperty],
    })
  }

  const perSquareMeterValue = getEnergyNumberProperty(
    properties,
    sourceProperty
  )
  const floorArea = getPositiveNumberProperty(properties, FLOOR_AREA_PROPERTY)

  if (perSquareMeterValue == null) {
    return missingValue({
      sourceProperties: [sourceProperty, FLOOR_AREA_PROPERTY],
    })
  }

  if (floorArea == null || !isUsableProduct(perSquareMeterValue, floorArea)) {
    return missingValue({
      sourceProperties: [sourceProperty, FLOOR_AREA_PROPERTY],
    })
  }

  const provenance = getEnergyEstimateProvenance({
    id: provenanceId,
    prefix,
    measure,
    estimateType,
    annual: true,
  })

  return estimateValue({
    amount: perSquareMeterValue * floorArea,
    text: plainText(
      formatNumber({
        value: perSquareMeterValue * floorArea,
        locale,
        maximumFractionDigits: 0,
      })
    ),
    unitKey: key('units.kwh_per_year'),
    sourceProperties: [sourceProperty, FLOOR_AREA_PROPERTY],
    provenance,
    note: getEstimatedValueNote({
      valueProvenance: provenance,
      sourceProperties: [sourceProperty, FLOOR_AREA_PROPERTY],
    }),
  })
}

const createEnergyMetric = ({
  id,
  seriesKey,
  estimateType,
  properties,
  prefix,
  locale,
}: {
  id: EnergymapBuildingInfoMetric['id']
  seriesKey: string
  estimateType: EnergymapEnergyEstimateType
  properties: EnergymapSelectedBuilding['properties']
  prefix: EnergymapEnergyScenarioPrefix | null
  locale: string
}): EnergymapBuildingInfoMetric => ({
  id,
  label: translationText(seriesKey),
  values: [
    metricValue({
      id: 'annualTotal',
      labelKey: key('panels.energy.metric.annual_total'),
      value: getAnnualEstimateValue({
        properties,
        prefix,
        measure: 'default',
        estimateType,
        provenanceId: CURRENT_ENERGY_PROVENANCE_IDS[estimateType].annualTotal,
        locale,
      }),
    }),
    metricValue({
      id: 'perSquareMeter',
      labelKey: key('panels.energy.metric.per_square_meter'),
      value: getPerSquareMeterEstimateValue({
        properties,
        prefix,
        measure: 'default',
        estimateType,
        provenanceId:
          CURRENT_ENERGY_PROVENANCE_IDS[estimateType].perSquareMeter,
        locale,
      }),
    }),
  ],
})

const ENERGY_SUBMETRIC_ORDER: readonly EnergymapBuildingInfoEnergySubmetricId[] =
  [
    'total',
    'electricity',
    'heating',
    'waterHeating',
    'purchasedElectricity',
    'districtHeat',
    'districtCooling',
    'fossilFuel',
    'renewableFuel',
    'other0',
    'other1',
    'other2',
  ]

const PRIMARY_METRIC_ORDER: readonly EnergymapBuildingInfoPrimaryMetricId[] = [
  'energy',
  'water',
  'cost',
  'co2',
]

const normalizeAvailableEnergySubmetricSelection = ({
  energySubmetrics,
  combinedEnergyMetric,
  selectedSubmetricIds,
}: {
  energySubmetrics: readonly EnergymapBuildingInfoEnergySubmetric[]
  combinedEnergyMetric: EnergymapBuildingInfoMetric | null
  selectedSubmetricIds: readonly EnergymapBuildingInfoEnergySubmetricId[]
}): EnergymapBuildingInfoEnergySubmetricId[] => {
  const availableIds = new Set(
    energySubmetrics.map((submetric) => submetric.id)
  )
  const requestedIds = new Set(selectedSubmetricIds)
  const selectedIds = ENERGY_SUBMETRIC_ORDER.filter(
    (id) => availableIds.has(id) && requestedIds.has(id)
  )

  if (selectedIds.length <= 1) {
    return selectedIds
  }

  if (
    selectedIds.length === 2 &&
    selectedIds[0] === 'electricity' &&
    selectedIds[1] === 'heating' &&
    combinedEnergyMetric != null
  ) {
    return selectedIds
  }

  const firstRequestedAvailableId = selectedSubmetricIds.find((id) =>
    availableIds.has(id)
  )

  return firstRequestedAvailableId == null ? [] : [firstRequestedAvailableId]
}

const getAvailableEnergySubmetrics = (
  controls: EnergymapBuildingInfoConsumptionControls
) => {
  const submetricById = new Map(
    (controls.energySubmetrics ?? []).map((submetric) => [
      submetric.id,
      submetric,
    ])
  )

  return ENERGY_SUBMETRIC_ORDER.map((id) => submetricById.get(id))
    .filter(
      (submetric): submetric is EnergymapBuildingInfoEnergySubmetric =>
        submetric != null && submetric.supported
    )
    .map((submetric) => ({
      ...submetric,
      metric: normalizeMetric(submetric.metric),
    }))
    .filter(
      (
        submetric
      ): submetric is EnergymapBuildingInfoEnergySubmetric & {
        metric: EnergymapBuildingInfoMetric
      } => submetric.metric != null
    )
}

const getEnergySubmetricSelectionOptions = (
  controls: EnergymapBuildingInfoConsumptionControls
) => {
  const energySubmetrics = getAvailableEnergySubmetrics(controls)
  const retainedIds = new Set(energySubmetrics.map((submetric) => submetric.id))
  const combinedEnergyMetric =
    retainedIds.has('electricity') && retainedIds.has('heating')
      ? normalizeMetric(controls.combinedEnergyMetric)
      : null

  return { energySubmetrics, combinedEnergyMetric }
}

export const normalizeEnergySubmetricSelection = ({
  controls,
  selectedSubmetricIds,
}: {
  controls: EnergymapBuildingInfoConsumptionControls
  selectedSubmetricIds: readonly EnergymapBuildingInfoEnergySubmetricId[]
}): EnergymapBuildingInfoEnergySubmetricId[] => {
  const { energySubmetrics, combinedEnergyMetric } =
    getEnergySubmetricSelectionOptions(controls)

  return normalizeAvailableEnergySubmetricSelection({
    energySubmetrics,
    combinedEnergyMetric,
    selectedSubmetricIds,
  })
}

export const getSelectedEnergyConsumption = ({
  controls,
  selectedSubmetricIds,
  basisId,
}: {
  controls: EnergymapBuildingInfoConsumptionControls
  selectedSubmetricIds: readonly EnergymapBuildingInfoEnergySubmetricId[]
  basisId?: EnergymapBuildingInfoEnergyBasis['id']
}): EnergymapBuildingInfoSelectedEnergyConsumption => {
  const { energySubmetrics, combinedEnergyMetric } =
    getEnergySubmetricSelectionOptions(controls)
  const submetricById = new Map(
    energySubmetrics.map((submetric) => [submetric.id, submetric])
  )
  const normalizedSelection = normalizeAvailableEnergySubmetricSelection({
    energySubmetrics,
    combinedEnergyMetric,
    selectedSubmetricIds,
  })
  const metric =
    normalizedSelection.length === 2
      ? combinedEnergyMetric
      : submetricById.get(normalizedSelection[0])?.metric

  const basis =
    metric?.bases?.find(({ id }) => id === basisId) ?? metric?.bases?.[0]
  return {
    metric: metric ?? undefined,
    basisId: basis?.id,
    values: basis?.values ?? metric?.values ?? [],
    notes: [],
  }
}

const createUnsupportedPrimaryMetric = ({
  id,
  labelKey,
  unavailableNoteKey,
  sourceProperties,
  status = 'placeholder',
}: {
  id: Exclude<EnergymapBuildingInfoPrimaryMetricId, 'energy'>
  labelKey: string
  unavailableNoteKey: string
  sourceProperties?: string[]
  status?: Extract<EnergymapBuildingInfoValueStatus, 'missing' | 'placeholder'>
}): EnergymapBuildingInfoPrimaryMetric => ({
  id,
  label: translationText(labelKey),
  ariaLabelKey: labelKey,
  supported: false,
  value:
    status === 'missing'
      ? missingValue({
          keyName: unavailableNoteKey,
          sourceProperties,
        })
      : placeholderValue({
          keyName: unavailableNoteKey,
          sourceProperties,
        }),
  unavailableNote: note({
    id: `${id}Unavailable`,
    keyName: unavailableNoteKey,
    status,
    sourceProperties,
  }),
})

type CurrentReferencePrimaryMetricId = Extract<
  EnergymapBuildingInfoPrimaryMetricId,
  'cost' | 'co2'
>

type CurrentReferencePrimaryMetricResult =
  | CurrentReferenceAnnualCostResult
  | CurrentReferenceAnnualCo2Result

const getCurrentReferenceSourceProperties = ({
  id,
  prefix,
}: {
  id: CurrentReferencePrimaryMetricId
  prefix: EnergymapEnergyScenarioPrefix | null
}) => [
  ...(id === 'cost' ? [ENERGYMAP_BUILDING_TYPE_PROPERTY] : []),
  FLOOR_AREA_PROPERTY,
  ...(prefix == null
    ? []
    : [
        getScenarioProperty({
          prefix,
          measure: 'default',
          estimateType: 'elec',
        }),
        getScenarioProperty({
          prefix,
          measure: 'default',
          estimateType: 'heat',
        }),
      ]),
  HEATING_ENERGY_SOURCE_PROPERTY,
  ...(prefix === 'elecb' || prefix === 'delec'
    ? [HEATING_METHOD_PROPERTY]
    : []),
]

const getRootUnsupportedReason = (
  result: CurrentReferenceUnsupportedResult
): CurrentReferenceUnsupportedReason =>
  result.reason === 'incomplete-component' && result.cause != null
    ? result.cause
    : result.reason

const getCurrentReferenceUnsupportedPresentation = ({
  id,
  result,
  prefix,
  properties,
}: {
  id: CurrentReferencePrimaryMetricId
  result: CurrentReferenceUnsupportedResult
  prefix: EnergymapEnergyScenarioPrefix | null
  properties: EnergymapSelectedBuilding['properties']
}): {
  keyName: string
  status: Extract<EnergymapBuildingInfoValueStatus, 'missing' | 'placeholder'>
} => {
  const reason = getRootUnsupportedReason(result)

  if (reason === 'unsupported-building-class') {
    return {
      keyName: key('panels.energy.unsupported.cost_building_class'),
      status: 'placeholder',
    }
  }

  if (reason === 'unsupported-carrier') {
    return {
      keyName: key('panels.energy.unsupported.heating_carrier'),
      status: 'placeholder',
    }
  }

  if (reason === 'unsupported-reference-value') {
    const isApartmentPelletCost =
      id === 'cost' &&
      prefix === 'wood' &&
      getCodeProperty(properties, ENERGYMAP_BUILDING_TYPE_PROPERTY) === '06'

    return {
      keyName: key(
        isApartmentPelletCost
          ? 'panels.energy.unsupported.apartment_pellet_cost'
          : 'panels.energy.unsupported.reference_value'
      ),
      status: 'placeholder',
    }
  }

  if (reason === 'missing-input') {
    const heatingSource = getCodeProperty(
      properties,
      HEATING_ENERGY_SOURCE_PROPERTY
    )
    const heatingMethod = getCodeProperty(properties, HEATING_METHOD_PROPERTY)
    const scenarioInputIsMissing =
      heatingSource == null || (heatingSource === '04' && heatingMethod == null)
    const unresolvedKnownInputs =
      result.field === 'scenarioPrefix' &&
      prefix == null &&
      !scenarioInputIsMissing

    return unresolvedKnownInputs
      ? {
          keyName: key('panels.energy.unsupported.heating_carrier'),
          status: 'placeholder',
        }
      : {
          keyName: key('panels.energy.unsupported.missing_reference_data'),
          status: 'missing',
        }
  }

  return {
    keyName: key('panels.energy.unsupported.invalid_reference_data'),
    status: 'placeholder',
  }
}

const createCurrentReferencePrimaryMetric = ({
  id,
  result,
  prefix,
  energyInput,
  properties,
  locale,
}: {
  id: CurrentReferencePrimaryMetricId
  result: CurrentReferencePrimaryMetricResult
  prefix: EnergymapEnergyScenarioPrefix | null
  energyInput: CurrentReferenceEnergyInput
  properties: EnergymapSelectedBuilding['properties']
  locale: string
}): EnergymapBuildingInfoPrimaryMetric => {
  const labelKey = key(`panels.energy.primary.${id}`)
  const sourceProperties = getCurrentReferenceSourceProperties({ id, prefix })

  if (result.status === 'unsupported') {
    const presentation = getCurrentReferenceUnsupportedPresentation({
      id,
      result,
      prefix,
      properties,
    })

    return {
      ...createUnsupportedPrimaryMetric({
        id,
        labelKey,
        unavailableNoteKey: presentation.keyName,
        sourceProperties,
        status: presentation.status,
      }),
      calculationFailure: result,
    }
  }

  const provenanceInputIds = getEnergymapCurrentReferenceProvenanceInputIds({
    kind: id,
    scenarioPrefix: prefix,
    mainPurpose: properties[ENERGYMAP_BUILDING_TYPE_PROPERTY],
    floorAreaSquareMeters: energyInput.floorAreaSquareMeters,
    defaultElectricityIntensityKwhPerSquareMeterYear:
      energyInput.defaultElectricityIntensityKwhPerSquareMeterYear,
    defaultHeatingIntensityKwhPerSquareMeterYear:
      energyInput.defaultHeatingIntensityKwhPerSquareMeterYear,
  })

  return {
    id,
    label: translationText(labelKey),
    ariaLabelKey: labelKey,
    supported: true,
    value: estimateValue({
      text: plainText(
        formatNumber({
          value: result.total,
          locale,
        })
      ),
      unitKey: key(
        id === 'cost' ? 'units.eur_per_year' : 'units.kg_co2_per_year'
      ),
      sourceProperties,
      ...(provenanceInputIds == null
        ? {}
        : {
            provenance: {
              id:
                id === 'cost'
                  ? ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.COST_ANNUAL
                  : ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CO2_ANNUAL,
              inputIds: provenanceInputIds,
            },
          }),
    }),
  }
}

const createCurrentReferenceWaterPrimaryMetric = ({
  floorAreaSquareMeters,
  allowOverrideWithoutDefault,
  locale,
}: {
  floorAreaSquareMeters: unknown
  allowOverrideWithoutDefault: boolean
  locale: string
}): EnergymapBuildingInfoPrimaryMetric => {
  const labelKey = key('panels.energy.primary.water')
  const sourceProperties = [FLOOR_AREA_PROPERTY]
  const residentCountResult = deriveCurrentReferenceResidentCount(
    floorAreaSquareMeters
  )
  const defaultValue =
    residentCountResult.status === 'complete'
      ? residentCountResult.residentCount
      : null
  const { occupancy } = CURRENT_REFERENCE_DATA.water
  const residentCountControl: EnergymapBuildingInfoResidentCountControl = {
    defaultValue,
    defaultFloorArea: floorAreaSquareMeters,
    minValue: occupancy.minimumResidents,
    maxValue: occupancy.maximumResidents,
    label: translationText(key('panels.energy.water.resident_count')),
    toggleLabel: translationText(
      key('panels.energy.water.change_resident_count')
    ),
    description: translationText(key('panels.energy.water.description')),
    unavailableText: translationText(
      key('panels.energy.water.invalid_resident_count')
    ),
    ...(defaultValue == null
      ? {}
      : {
          sourceProperties,
          provenance: {
            id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_RESIDENT_COUNT_CONTROL,
            inputIds:
              ENERGYMAP_DERIVED_WATER_RESIDENT_CONTROL_PROVENANCE_INPUT_IDS,
          },
        }),
  }

  if (residentCountResult.status === 'unsupported') {
    return {
      ...createUnsupportedPrimaryMetric({
        id: 'water',
        labelKey,
        unavailableNoteKey: key('panels.energy.unsupported.water'),
        sourceProperties,
        status: 'missing',
      }),
      calculationFailure: residentCountResult,
      ...(allowOverrideWithoutDefault ? { residentCountControl } : {}),
    }
  }

  const annualWaterResult = calculateCurrentReferenceAnnualWater(
    residentCountResult.residentCount
  )
  if (annualWaterResult.status === 'unsupported') {
    return {
      ...createUnsupportedPrimaryMetric({
        id: 'water',
        labelKey,
        unavailableNoteKey: key('panels.energy.unsupported.water'),
        sourceProperties,
        status: 'missing',
      }),
      calculationFailure: annualWaterResult,
    }
  }

  return {
    id: 'water',
    label: translationText(labelKey),
    ariaLabelKey: labelKey,
    supported: true,
    value: estimateValue({
      text: plainText(
        formatNumber({
          value: annualWaterResult.cubicMetersPerYear,
          locale,
          maximumFractionDigits: 1,
        })
      ),
      unitKey: key('units.cubic_meters_per_year'),
      sourceProperties,
      provenance: {
        id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.WATER_ANNUAL,
        inputIds: ENERGYMAP_DERIVED_WATER_PROVENANCE_INPUT_IDS,
      },
    }),
    residentCountControl,
  }
}

const normalizeResidentCountControl = (
  control: EnergymapBuildingInfoResidentCountControl | null | undefined
): EnergymapBuildingInfoResidentCountControl | null => {
  if (
    control == null ||
    !Number.isFinite(control.minValue) ||
    !Number.isFinite(control.maxValue) ||
    control.minValue > control.maxValue ||
    (control.defaultValue != null &&
      (!Number.isFinite(control.defaultValue) ||
        control.minValue > control.defaultValue ||
        control.defaultValue > control.maxValue))
  ) {
    return null
  }

  const label = normalizeEnergymapBuildingInfoText(control.label)
  const toggleLabel = normalizeEnergymapBuildingInfoText(control.toggleLabel)
  const description = normalizeEnergymapBuildingInfoText(control.description)
  const unavailableText = normalizeEnergymapBuildingInfoText(
    control.unavailableText
  )

  return label == null ||
    toggleLabel == null ||
    description == null ||
    unavailableText == null
    ? null
    : {
        ...control,
        label,
        toggleLabel,
        description,
        unavailableText,
      }
}

const normalizePrimaryMetric = (
  candidate: EnergymapBuildingInfoPrimaryMetric
): EnergymapBuildingInfoPrimaryMetric | null => {
  if (candidate.id === 'energy') {
    return null
  }

  const label = normalizeEnergymapBuildingInfoText(candidate.label)
  const value = normalizeValue(candidate.value)
  const residentCountControl =
    candidate.id === 'water'
      ? normalizeResidentCountControl(candidate.residentCountControl)
      : null
  // An available editor can produce Water even when its default estimate fails.
  // Keep the control, but never normalize an unavailable result into a value.
  if (
    label == null ||
    candidate.ariaLabelKey.trim() === '' ||
    ((!candidate.supported || value == null) && residentCountControl == null)
  ) {
    return null
  }
  const {
    value: _value,
    unavailableNote: _unavailableNote,
    residentCountControl: _residentCountControl,
    ...candidateWithoutOptionalContent
  } = candidate

  return {
    ...candidateWithoutOptionalContent,
    label,
    supported: true,
    ...(value == null ? {} : { value }),
    ...(residentCountControl == null ? {} : { residentCountControl }),
  }
}

const normalizeEnergySubmetric = (
  candidate: EnergymapBuildingInfoEnergySubmetric
): EnergymapBuildingInfoEnergySubmetric | null => {
  if (!candidate.supported) {
    return null
  }

  const label = normalizeEnergymapBuildingInfoText(candidate.label)
  const metric = normalizeMetric(candidate.metric)
  if (label == null || metric == null) {
    return null
  }

  const { unavailableNote: _unavailableNote, ...candidateWithoutNote } =
    candidate
  return {
    ...candidateWithoutNote,
    label,
    supported: true,
    metric,
  }
}

const normalizeConsumptionControls = (
  controls: EnergymapBuildingInfoConsumptionControls | null | undefined
): EnergymapBuildingInfoConsumptionControls | null => {
  if (controls == null) {
    return null
  }

  const submetricById = new Map(
    (controls.energySubmetrics ?? []).map((submetric) => [
      submetric.id,
      submetric,
    ])
  )
  const normalizedEnergySubmetrics = ENERGY_SUBMETRIC_ORDER.map((id) => {
    const candidate = submetricById.get(id)
    return candidate == null ? null : normalizeEnergySubmetric(candidate)
  }).filter(
    (submetric): submetric is EnergymapBuildingInfoEnergySubmetric =>
      submetric != null
  )
  const retainedSubmetricIds = new Set(
    normalizedEnergySubmetrics.map((submetric) => submetric.id)
  )
  const combinedEnergyMetric =
    retainedSubmetricIds.has('electricity') &&
    retainedSubmetricIds.has('heating')
      ? normalizeMetric(controls.combinedEnergyMetric)
      : null
  const requestedDefaultSubmetricIds = new Set(
    controls.defaultEnergySubmetricIds ?? []
  )
  const retainedDefaultSubmetricIds = ENERGY_SUBMETRIC_ORDER.filter(
    (id) => retainedSubmetricIds.has(id) && requestedDefaultSubmetricIds.has(id)
  )
  const availableDefaultSubmetricIds =
    retainedDefaultSubmetricIds.length > 0
      ? retainedDefaultSubmetricIds
      : normalizedEnergySubmetrics.slice(0, 1).map((submetric) => submetric.id)
  const defaultEnergySubmetricIds = normalizeAvailableEnergySubmetricSelection({
    energySubmetrics: normalizedEnergySubmetrics,
    combinedEnergyMetric,
    selectedSubmetricIds: availableDefaultSubmetricIds,
  })
  const defaultEnergySubmetricIdSet = new Set(defaultEnergySubmetricIds)
  const energySubmetrics = normalizedEnergySubmetrics.map((submetric) => ({
    ...submetric,
    defaultSelected: defaultEnergySubmetricIdSet.has(submetric.id),
  }))

  const primaryMetricById = new Map(
    controls.primaryMetrics.map((metric) => [metric.id, metric])
  )
  const primaryMetrics = PRIMARY_METRIC_ORDER.map((id) => {
    const candidate = primaryMetricById.get(id)
    if (candidate == null) {
      return null
    }

    if (id !== 'energy') {
      return normalizePrimaryMetric(candidate)
    }

    const label = normalizeEnergymapBuildingInfoText(candidate.label)
    if (
      energySubmetrics.length === 0 ||
      label == null ||
      candidate.ariaLabelKey.trim() === ''
    ) {
      return null
    }

    return {
      id: candidate.id,
      label,
      ariaLabelKey: candidate.ariaLabelKey,
      supported: true,
    }
  }).filter(
    (metric): metric is EnergymapBuildingInfoPrimaryMetric => metric != null
  )

  if (primaryMetrics.length === 0) {
    return null
  }

  const retainedPrimaryIds = new Set(primaryMetrics.map((metric) => metric.id))
  const defaultPrimaryMetricId = retainedPrimaryIds.has(
    controls.defaultPrimaryMetricId
  )
    ? controls.defaultPrimaryMetricId
    : primaryMetrics[0].id
  return {
    defaultPrimaryMetricId,
    primaryMetrics,
    ...(energySubmetrics.length === 0
      ? {}
      : { defaultEnergySubmetricIds, energySubmetrics }),
    ...(combinedEnergyMetric == null ? {} : { combinedEnergyMetric }),
  }
}

const createConsumptionControls = ({
  totalMetric,
  heatingMetric,
  electricityMetric,
  waterMetric,
  costMetric,
  co2Metric,
}: {
  totalMetric: EnergymapBuildingInfoMetric
  heatingMetric: EnergymapBuildingInfoMetric
  electricityMetric: EnergymapBuildingInfoMetric
  waterMetric: EnergymapBuildingInfoPrimaryMetric
  costMetric: EnergymapBuildingInfoPrimaryMetric
  co2Metric: EnergymapBuildingInfoPrimaryMetric
}): EnergymapBuildingInfoConsumptionControls => ({
  defaultPrimaryMetricId: 'energy',
  primaryMetrics: [
    {
      id: 'energy',
      label: translationText(key('panels.energy.primary.energy')),
      ariaLabelKey: key('panels.energy.primary.energy'),
      supported: true,
    },
    waterMetric,
    costMetric,
    co2Metric,
  ],
  defaultEnergySubmetricIds: ['electricity', 'heating'],
  energySubmetrics: [
    {
      id: 'electricity',
      label: translationText(key('panels.energy.series.electricity')),
      ariaLabelKey: key('panels.energy.series.electricity'),
      supported: true,
      defaultSelected: true,
      metric: electricityMetric,
    },
    {
      id: 'heating',
      label: translationText(key('panels.energy.series.heating')),
      ariaLabelKey: key('panels.energy.series.heating'),
      supported: true,
      defaultSelected: true,
      metric: heatingMetric,
    },
  ],
  combinedEnergyMetric: totalMetric,
})

const getCodeLabelValue = ({
  codeValue,
  codeType,
  knownCodes,
  sourceProperty,
  provenance,
}: {
  codeValue: string | null
  codeType: 'main_purpose' | 'heating_method' | 'heating_energy_source'
  knownCodes: readonly string[]
  sourceProperty: string
  provenance?: EnergymapBuildingInfoProvenanceRef
}): EnergymapBuildingInfoValue => {
  if (codeValue == null) {
    return missingValue({ sourceProperties: [sourceProperty] })
  }

  if (knownCodes.includes(codeValue)) {
    return realValue({
      text: translationText(key(`codes.${codeType}.${codeValue}`)),
      sourceProperties: [sourceProperty],
      provenance,
    })
  }

  return realValue({
    text: translationText(key('placeholders.unknown_code'), {
      code: codeValue,
    }),
    sourceProperties: [sourceProperty],
    provenance,
  })
}

const getHeatingValue = (
  properties: EnergymapSelectedBuilding['properties']
): EnergymapBuildingInfoValue => {
  const methodCode = getCodeProperty(properties, HEATING_METHOD_PROPERTY)
  const sourceCode = getCodeProperty(properties, HEATING_ENERGY_SOURCE_PROPERTY)
  const methodValue = getCodeLabelValue({
    codeValue: methodCode,
    codeType: 'heating_method',
    knownCodes: HEATING_METHOD_CODES,
    sourceProperty: HEATING_METHOD_PROPERTY,
  })
  const sourceValue = getCodeLabelValue({
    codeValue: sourceCode,
    codeType: 'heating_energy_source',
    knownCodes: HEATING_ENERGY_SOURCE_CODES,
    sourceProperty: HEATING_ENERGY_SOURCE_PROPERTY,
  })
  const realParts = [sourceValue, methodValue].filter(
    (value) => value.status === 'real'
  )

  if (realParts.length === 0) {
    return missingValue({
      sourceProperties: [
        HEATING_ENERGY_SOURCE_PROPERTY,
        HEATING_METHOD_PROPERTY,
      ],
    })
  }

  return realValue({
    text: sequenceText(realParts.map((part) => part.text)),
    sourceProperties: realParts.flatMap((part) => part.sourceProperties ?? []),
    provenance: {
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.HEATING,
      inputIds: [
        ...(sourceValue.status === 'real'
          ? [ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_HEATING_SOURCE]
          : []),
        ...(methodValue.status === 'real'
          ? [ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_HEATING_METHOD]
          : []),
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.COMBINE_HEATING_FACTS,
      ],
    },
  })
}

// FI/EN UI uses FI first, then SV, independently for each source fact.
// Source-language metadata identifies the field, not detected prose language.
const getVentilationSourceText = ({
  properties,
  fields,
}: {
  properties: EnergymapSelectedBuilding['properties']
  fields: { fi: string; sv: string }
}) => {
  for (const sourceLanguage of ['fi', 'sv'] as const) {
    const sourceProperty = fields[sourceLanguage]
    const raw = properties[sourceProperty]
    if (typeof raw === 'string' && raw.trim() !== '') {
      return { text: raw.trim(), sourceProperty, sourceLanguage }
    }
  }
  return null
}

const getVentilationValue = (
  properties: EnergymapSelectedBuilding['properties']
): EnergymapBuildingInfoValue => {
  const source = getVentilationSourceText({
    properties,
    fields: ENERGYMAP_VENTILATION_DESCRIPTION_PROPERTIES,
  })
  if (source == null) return missingValue()

  return realValue({
    text: plainText(source.text),
    sourceProperties: [source.sourceProperty],
    sourceLanguage: source.sourceLanguage,
    provenance: {
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.VENTILATION,
      inputIds: [
        source.sourceLanguage === 'fi'
          ? ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_VENTILATION_FI
          : ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_VENTILATION_SV,
      ],
    },
  })
}

const getVentilationTypeValue = (
  properties: EnergymapSelectedBuilding['properties']
): EnergymapBuildingInfoValue => {
  const source = getVentilationSourceText({
    properties,
    fields: ENERGYMAP_VENTILATION_LABEL_PROPERTIES,
  })
  if (source == null) return missingValue()

  const code = properties[ENERGYMAP_VENTILATION_TYPE_PROPERTY]
  const hasCode = typeof code === 'string' && code.trim() !== ''
  const codeInputId =
    ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_VENTILATION_CODE
  return realValue({
    text: plainText(source.text),
    sourceProperties: [
      source.sourceProperty,
      ...(hasCode ? [ENERGYMAP_VENTILATION_TYPE_PROPERTY] : []),
    ],
    sourceLanguage: source.sourceLanguage,
    provenance: {
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.VENTILATION_TYPE,
      inputIds: [
        source.sourceLanguage === 'fi'
          ? ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.VENTILATION_LABEL_FI
          : ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.VENTILATION_LABEL_SV,
        ...(hasCode ? [codeInputId] : []),
      ],
      ...(hasCode ? { runtimeValues: { [codeInputId]: code } } : {}),
    },
  })
}

const getVentilationCategoryValue = (
  properties: EnergymapSelectedBuilding['properties']
): EnergymapBuildingInfoValue => {
  const category = properties[ENERGYMAP_VENTILATION_CATEGORY_PROPERTY]
  if (!isEnergymapVentilationCategory(category) || category === 'no_info') {
    return missingValue()
  }

  const inputId =
    ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.VENTILATION_CATEGORY
  return realValue({
    text: translationText(`sidebar.front_page.ventilation.legend.${category}`),
    sourceProperties: [ENERGYMAP_VENTILATION_CATEGORY_PROPERTY],
    provenance: {
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.VENTILATION_CATEGORY,
      inputIds: [inputId],
      runtimeValues: { [inputId]: category },
    },
  })
}

const getEnergyCertificateRecommendationsValue = (
  properties: EnergymapSelectedBuilding['properties']
): EnergymapBuildingInfoValue => {
  for (const sourceLanguage of ENERGY_CERTIFICATE_RECOMMENDATIONS_SOURCE_ORDER) {
    const propertyName =
      ENERGY_CERTIFICATE_RECOMMENDATIONS_PROPERTIES[sourceLanguage]

    if (typeof properties[propertyName] !== 'string') {
      continue
    }

    const recommendations = getStringProperty(properties, propertyName)

    if (recommendations != null) {
      return realValue({
        text: plainText(recommendations),
        sourceProperties: [propertyName],
        sourceLanguage,
        provenance: {
          id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CERTIFICATE_RECOMMENDATIONS,
          inputIds: [
            sourceLanguage === 'fi'
              ? ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_RECOMMENDATIONS_FI
              : ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_RECOMMENDATIONS_SV,
          ],
        },
      })
    }
  }

  return missingValue({
    sourceProperties: [
      ENERGY_CERTIFICATE_RECOMMENDATIONS_FI_PROPERTY,
      ENERGY_CERTIFICATE_RECOMMENDATIONS_SV_PROPERTY,
    ],
  })
}

const getEnergyClassValue = ({
  properties,
  propertyName,
  provenance,
  sourceProperties = [propertyName],
}: {
  properties: EnergymapSelectedBuilding['properties']
  propertyName: EnergyClassProperty
  provenance?: EnergymapBuildingInfoProvenanceRef
  sourceProperties?: string[]
}): EnergymapBuildingInfoValue => {
  const classCode = getStringProperty(properties, propertyName)

  if (classCode == null) {
    return missingValue({ sourceProperties })
  }

  if (
    ENERGY_CERTIFICATE_CLASS_CODES.includes(
      classCode as EnergyCertificateClassCode
    )
  ) {
    return realValue({
      text: plainText(classCode),
      sourceProperties,
      provenance,
    })
  }

  return realValue({
    text: translationText(key('placeholders.unknown_code'), {
      code: classCode,
    }),
    sourceProperties,
    provenance,
  })
}

const getModeledEnergyClassProvenanceEvidence = (
  properties: EnergymapSelectedBuilding['properties'],
  includeOutput = true
) =>
  getEnergymapModeledClassProvenanceEvidence({
    mainPurpose: properties[ENERGYMAP_BUILDING_TYPE_PROPERTY],
    completionDate: properties[ENERGYMAP_BUILDING_COMPLETION_DATE_PROPERTY],
    heatingEnergySource: properties[HEATING_ENERGY_SOURCE_PROPERTY],
    heatingMethod: properties[HEATING_METHOD_PROPERTY],
    floorArea: properties[FLOOR_AREA_PROPERTY],
    totalArea: properties[TOTAL_AREA_PROPERTY],
    grossFloorArea: properties[GROSS_FLOOR_AREA_PROPERTY],
    numberOfStoreys: properties[NUMBER_OF_STOREYS_PROPERTY],
    areaSource: properties[MODELED_ENERGY_CLASS_AREA_SOURCE_PROPERTY],
    includeOutput,
  })

const getModeledEnergyClassIndicator = (
  properties: EnergymapSelectedBuilding['properties']
): EnergymapBuildingInfoRow['modeledIndicator'] => {
  if (properties[IS_ENERGY_CLASS_MODELED_PROPERTY] !== true) return undefined

  const evidence = getModeledEnergyClassProvenanceEvidence(properties, false)
  return {
    label: translationText(key('panels.building.energy_class_modeled.label')),
    tooltip: translationText(
      key('panels.building.energy_class_modeled.tooltip')
    ),
    ariaLabelKey: key('panels.building.energy_class_modeled.help_aria_label'),
    sourceProperties: [...evidence.sourceProperties],
    provenance: {
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED_INDICATOR,
      inputIds: evidence.inputIds,
    },
  }
}

const getEnergyCertificateValidityValue = ({
  properties,
  locale,
}: {
  properties: EnergymapSelectedBuilding['properties']
  locale: string
}): EnergymapBuildingInfoValue => {
  const validityEnd = formatCalendarDate({
    value: properties[ENERGY_CERTIFICATE_VALID_UNTIL_PROPERTY],
    locale,
  })

  if (validityEnd == null) {
    return missingValue({
      sourceProperties: [ENERGY_CERTIFICATE_VALID_UNTIL_PROPERTY],
    })
  }

  return realValue({
    text: plainText(validityEnd),
    sourceProperties: [ENERGY_CERTIFICATE_VALID_UNTIL_PROPERTY],
    provenance: {
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CERTIFICATE_VALIDITY,
      inputIds: [
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_VALID_UNTIL,
      ],
    },
  })
}

const getYearValue = (
  properties: EnergymapSelectedBuilding['properties']
): EnergymapBuildingInfoValue => {
  const year = formatYearFromDate(
    properties[ENERGYMAP_BUILDING_COMPLETION_DATE_PROPERTY]
  )

  if (year == null) {
    return missingValue({
      sourceProperties: [ENERGYMAP_BUILDING_COMPLETION_DATE_PROPERTY],
    })
  }

  return realValue({
    text: plainText(year),
    sourceProperties: [ENERGYMAP_BUILDING_COMPLETION_DATE_PROPERTY],
    provenance: {
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CONSTRUCTION_YEAR,
      inputIds: [
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_COMPLETION_DATE,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.PARSE_CONSTRUCTION_YEAR,
      ],
    },
  })
}

const getAddressValue = (
  properties: EnergymapSelectedBuilding['properties']
): EnergymapBuildingInfoValue => {
  const address = composeEnergymapBuildingAddress(properties)

  if (address == null) {
    return missingValue({
      sourceProperties: [
        ADDRESS_FIN_PROPERTY,
        POSTAL_CODE_PROPERTY,
        POSTAL_OFFICE_FIN_PROPERTY,
      ],
    })
  }

  const addressComponents = [
    {
      propertyName: ADDRESS_FIN_PROPERTY,
      inputId: ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_ADDRESS,
    },
    {
      propertyName: POSTAL_CODE_PROPERTY,
      inputId: ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_POSTAL_CODE,
    },
    {
      propertyName: POSTAL_OFFICE_FIN_PROPERTY,
      inputId: ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_POSTAL_OFFICE,
    },
  ].filter(
    ({ propertyName }) => getStringProperty(properties, propertyName) != null
  )

  return realValue({
    text: plainText(address),
    sourceProperties: addressComponents.map(({ propertyName }) => propertyName),
    provenance: {
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_ADDRESS,
      inputIds: [
        ...addressComponents.map(({ inputId }) => inputId),
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.COMPOSE_ADDRESS,
      ],
    },
  })
}

const getStringValue = ({
  properties,
  propertyName,
  provenance,
}: {
  properties: EnergymapSelectedBuilding['properties']
  propertyName: string
  provenance?: EnergymapBuildingInfoProvenanceRef
}): EnergymapBuildingInfoValue => {
  const value = getOpaqueIdentifier(properties[propertyName])

  if (value == null) {
    return missingValue({ sourceProperties: [propertyName] })
  }

  return realValue({
    text: plainText(value),
    sourceProperties: [propertyName],
    provenance,
  })
}

const getPropertyIdentifierValue = (
  properties: EnergymapSelectedBuilding['properties']
): EnergymapBuildingInfoValue => {
  const value = properties.property_identifier
  const sourceProperties = ['property_identifier']

  // Registry identifiers are opaque: never trim, coerce, or lose leading zeroes.
  if (
    typeof value !== 'string' ||
    value.length !== 14 ||
    !/^[0-9]{14}$/.test(value) ||
    value === '00000000000000'
  ) {
    return missingValue({ sourceProperties })
  }

  return realValue({
    text: plainText(value),
    sourceProperties,
    provenance: {
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.PROPERTY_IDENTIFIER,
      inputIds: [
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_PROPERTY_IDENTIFIER,
      ],
    },
  })
}

const getMeasurementValue = ({
  properties,
  propertyName,
  unitKey,
  provenance,
  locale,
}: {
  properties: EnergymapSelectedBuilding['properties']
  propertyName: string
  unitKey: string
  provenance?: EnergymapBuildingInfoProvenanceRef
  locale: string
}): EnergymapBuildingInfoValue => {
  const value = getPositiveNumberProperty(properties, propertyName)

  if (value == null) {
    return missingValue({ sourceProperties: [propertyName] })
  }

  return realValue({
    text: plainText(
      formatNumber({
        value,
        locale,
        maximumFractionDigits: 1,
      })
    ),
    unitKey,
    sourceProperties: [propertyName],
    provenance,
  })
}

const getCurrentEnergyClassProvenance = (
  properties: EnergymapSelectedBuilding['properties']
): EnergymapBuildingInfoProvenanceRef => {
  const modeled = properties[IS_ENERGY_CLASS_MODELED_PROPERTY]

  if (modeled === true) {
    const evidence = getModeledEnergyClassProvenanceEvidence(properties)
    return {
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_MODELED,
      inputIds: evidence.inputIds,
    }
  }

  if (modeled === false) {
    return {
      id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_OFFICIAL,
      inputIds: [
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_CURRENT_CLASS,
        ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CLASS_ORIGIN_OFFICIAL,
      ],
    }
  }

  return {
    id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ENERGY_CLASS_ORIGIN_UNAVAILABLE,
    inputIds: [
      ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.SELECTED_BUILDING_CURRENT_CLASS,
      ...(Object.hasOwn(properties, IS_ENERGY_CLASS_MODELED_PROPERTY)
        ? [
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.SELECTED_BUILDING_INVALID_CLASS_ORIGIN,
          ]
        : []),
    ],
  }
}

const getCurrentEnergyClassSourceProperties = (
  properties: EnergymapSelectedBuilding['properties']
): string[] => {
  if (properties[IS_ENERGY_CLASS_MODELED_PROPERTY] === true) {
    return [
      ...getModeledEnergyClassProvenanceEvidence(properties).sourceProperties,
    ]
  }

  return Object.hasOwn(properties, IS_ENERGY_CLASS_MODELED_PROPERTY)
    ? [ENERGY_CLASS_PROPERTY, IS_ENERGY_CLASS_MODELED_PROPERTY]
    : [ENERGY_CLASS_PROPERTY]
}

type ReferenceEnergyAvailability = 'complete' | 'partial' | 'absent'

type CertificateComponentKey =
  keyof typeof ENERGYMAP_BUILDING_INFO_CERTIFICATE_COMPONENT_PROVENANCE

type CertificateEvidenceContext = {
  inputIds: readonly EnergymapBuildingInfoProvenanceInputId[]
  runtimeValues: Readonly<
    Partial<
      Record<
        EnergymapBuildingInfoProvenanceInputId,
        EnergymapBuildingInfoProvenanceRuntimeValue
      >
    >
  >
}

const CERTIFICATE_SOURCE_PROPERTIES = [
  ENERGY_CERTIFICATE_CONSUMPTION_PROPERTY,
] as const

const CERTIFICATE_STANDARD_COMPONENT_CONFIG = {
  electricity: {
    metricId: 'purchasedElectricity',
    labelKey: 'electricity',
  },
  district_heat: {
    metricId: 'districtHeat',
    labelKey: 'district_heat',
  },
  district_cooling: {
    metricId: 'districtCooling',
    labelKey: 'district_cooling',
  },
  fossil_fuel: {
    metricId: 'fossilFuel',
    labelKey: 'fossil_fuel',
  },
  renewable_fuel: {
    metricId: 'renewableFuel',
    labelKey: 'renewable_fuel',
  },
} as const satisfies Record<
  EnergyCertificateConsumptionStandardCarrier,
  {
    metricId: EnergymapBuildingInfoMetricId
    labelKey: string
  }
>

const CERTIFICATE_OTHER_COMPONENT_CONFIG = {
  0: { componentKey: 'other0', metricId: 'other0' },
  1: { componentKey: 'other1', metricId: 'other1' },
  2: { componentKey: 'other2', metricId: 'other2' },
} as const satisfies Record<
  0 | 1 | 2,
  {
    componentKey: CertificateComponentKey
    metricId: EnergymapBuildingInfoMetricId
  }
>

const getReferenceEnergyAvailability = ({
  totalMetric,
  heatingMetric,
  electricityMetric,
}: {
  totalMetric: EnergymapBuildingInfoMetric
  heatingMetric: EnergymapBuildingInfoMetric
  electricityMetric: EnergymapBuildingInfoMetric
}): ReferenceEnergyAvailability => {
  const values = [totalMetric, heatingMetric, electricityMetric].flatMap(
    (metric) =>
      (['annualTotal', 'perSquareMeter'] as const).map((valueId) =>
        metric.values.find(({ id }) => id === valueId)
      )
  )
  const availableCount = values.filter(
    isEnergymapBuildingInfoValueAvailable
  ).length

  if (availableCount === values.length) return 'complete'
  return availableCount === 0 ? 'absent' : 'partial'
}

const createCertificateEvidenceContext = (
  record: EnergyCertificateConsumptionRecord
): CertificateEvidenceContext => {
  const inputIds: EnergymapBuildingInfoProvenanceInputId[] = [
    ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.basis,
    ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.unit,
    ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.certificateVersion,
    ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.certificateId,
    ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.completeness,
  ]
  const runtimeValues: Partial<
    Record<
      EnergymapBuildingInfoProvenanceInputId,
      EnergymapBuildingInfoProvenanceRuntimeValue
    >
  > = {
    [ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.basis]: record.basis,
    [ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.unit]: record.unit,
    [ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.certificateVersion]:
      record.certificateVersion,
    [ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.certificateId]:
      record.certificateId,
    [ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.completeness]:
      record.completeness,
  }

  if (record.signedAt != null) {
    inputIds.push(ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.signedAt)
    runtimeValues[ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.signedAt] =
      record.signedAt
  }
  if (record.validUntil != null) {
    inputIds.push(ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.validUntil)
    runtimeValues[ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.validUntil] =
      record.validUntil
  }

  return { inputIds, runtimeValues }
}

const createCertificateProvenance = ({
  id,
  context,
  additionalInputs = [],
}: {
  id: EnergymapBuildingInfoProvenanceId
  context: CertificateEvidenceContext
  additionalInputs?: readonly {
    id: EnergymapBuildingInfoProvenanceInputId
    value?: EnergymapBuildingInfoProvenanceRuntimeValue
  }[]
}): EnergymapBuildingInfoProvenanceRef => ({
  id,
  inputIds: [...context.inputIds, ...additionalInputs.map((input) => input.id)],
  runtimeValues: {
    ...context.runtimeValues,
    ...Object.fromEntries(
      additionalInputs.flatMap((input) =>
        input.value == null ? [] : [[input.id, input.value]]
      )
    ),
  },
})

const getCertificateComponentDetails = (
  component: EnergyCertificateConsumptionComponent
): {
  componentKey: CertificateComponentKey
  metricId: EnergymapBuildingInfoMetricId
  label: EnergymapBuildingInfoText
  inputId: EnergymapBuildingInfoProvenanceInputId
  nameInput?: {
    id: EnergymapBuildingInfoProvenanceInputId
    value: string
  }
} => {
  if (component.carrier !== 'other') {
    const config = CERTIFICATE_STANDARD_COMPONENT_CONFIG[component.carrier]
    return {
      componentKey: component.carrier,
      metricId: config.metricId,
      label: translationText(
        component.carrier === 'electricity'
          ? key('panels.energy.series.purchased_electricity')
          : key(`panels.energy.certificate.carriers.${config.labelKey}`)
      ),
      inputId:
        ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.components[
          component.carrier
        ],
    }
  }

  const config = CERTIFICATE_OTHER_COMPONENT_CONFIG[component.sourceSlot]
  const sourceNameIsAvailable =
    component.sourceName != null && component.sourceName.trim() !== ''
  return {
    componentKey: config.componentKey,
    metricId: config.metricId,
    label: sourceNameIsAvailable
      ? plainText(component.sourceName as string)
      : translationText(
          key(
            `panels.energy.certificate.carriers.other_${component.sourceSlot + 1}`
          )
        ),
    inputId:
      ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.components[
        config.componentKey
      ],
    ...(sourceNameIsAvailable
      ? {
          nameInput: {
            id: ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.otherNames[
              config.componentKey
            ],
            value: component.sourceName as string,
          },
        }
      : {}),
  }
}

const createCertificateMetric = ({
  component,
  context,
  heatedNetAreaM2,
  locale,
}: {
  component: EnergyCertificateConsumptionComponent
  context: CertificateEvidenceContext
  heatedNetAreaM2?: number
  locale: string
}): EnergymapBuildingInfoMetric => {
  const details = getCertificateComponentDetails(component)
  const provenanceIds =
    ENERGYMAP_BUILDING_INFO_CERTIFICATE_COMPONENT_PROVENANCE[
      details.componentKey
    ]
  const componentInput = {
    id: details.inputId,
    value: component.annualKwh,
  } as const
  const commonComponentInputs = [
    componentInput,
    ...(details.nameInput == null ? [] : [details.nameInput]),
  ]

  return {
    id: details.metricId,
    coverage: { kind: 'carrier', complete: false },
    label: details.label,
    labelSourceProperties: [...CERTIFICATE_SOURCE_PROPERTIES],
    labelProvenance: createCertificateProvenance({
      id: provenanceIds.label,
      context,
      additionalInputs: commonComponentInputs,
    }),
    values: [
      metricValue({
        id: 'annualTotal',
        labelKey: key('panels.energy.metric.annual_total'),
        value: estimateValue({
          amount: component.annualKwh,
          text: plainText(
            formatNumber({
              value: component.annualKwh,
              locale,
              maximumFractionDigits: 1,
            })
          ),
          sourceProperties: [...CERTIFICATE_SOURCE_PROPERTIES],
          unitKey: key('units.kwh_per_year'),
          provenance: createCertificateProvenance({
            id: provenanceIds.annual,
            context,
            additionalInputs: commonComponentInputs,
          }),
        }),
      }),
      ...(heatedNetAreaM2 == null ||
      !isUsableEnergyIntensity(component.annualKwh, heatedNetAreaM2)
        ? []
        : [
            metricValue({
              id: 'perSquareMeter',
              labelKey: key(
                'panels.energy.certificate.metric.per_square_meter'
              ),
              value: estimateValue({
                amount: component.annualKwh / heatedNetAreaM2,
                denominator: {
                  id: 'certificateHeatedNetArea',
                  areaM2: heatedNetAreaM2,
                },
                text: plainText(
                  formatNumber({
                    value: component.annualKwh / heatedNetAreaM2,
                    locale,
                    maximumFractionDigits: 1,
                  })
                ),
                sourceProperties: [...CERTIFICATE_SOURCE_PROPERTIES],
                unitKey: key('units.kwh_per_square_meter_year'),
                provenance: createCertificateProvenance({
                  id: provenanceIds.perSquareMeter,
                  context,
                  additionalInputs: [
                    ...commonComponentInputs,
                    {
                      id: ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.heatedNetArea,
                      value: heatedNetAreaM2,
                    },
                    {
                      id: ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.annualDividedByHeatedArea,
                    },
                  ],
                }),
              }),
            }),
          ]),
    ],
  }
}

const createCertificateTotalMetric = ({
  record,
  context,
  locale,
}: {
  record: Extract<
    EnergyCertificateConsumptionRecord,
    { completeness: 'complete' }
  >
  context: CertificateEvidenceContext
  locale: string
}): EnergymapBuildingInfoMetric => {
  const totalInput = {
    id: ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.total,
    value: record.totalKwhYear,
  } as const

  return {
    id: 'total',
    coverage: { kind: 'total', complete: true },
    label: translationText(
      key('panels.energy.certificate.metric.complete_total')
    ),
    labelSourceProperties: [...CERTIFICATE_SOURCE_PROPERTIES],
    labelProvenance: createCertificateProvenance({
      id: ENERGYMAP_BUILDING_INFO_CERTIFICATE_PROVENANCE_IDS.CERTIFICATE_CONSUMPTION_TOTAL_LABEL,
      context,
      additionalInputs: [totalInput],
    }),
    values: [
      metricValue({
        id: 'annualTotal',
        labelKey: key('panels.energy.metric.annual_total'),
        value: estimateValue({
          amount: record.totalKwhYear,
          text: plainText(
            formatNumber({
              value: record.totalKwhYear,
              locale,
              maximumFractionDigits: 1,
            })
          ),
          sourceProperties: [...CERTIFICATE_SOURCE_PROPERTIES],
          unitKey: key('units.kwh_per_year'),
          provenance: createCertificateProvenance({
            id: ENERGYMAP_BUILDING_INFO_CERTIFICATE_PROVENANCE_IDS.CERTIFICATE_CONSUMPTION_TOTAL_ANNUAL,
            context,
            additionalInputs: [totalInput],
          }),
        }),
      }),
      ...(record.heatedNetAreaM2 == null ||
      !isUsableEnergyIntensity(record.totalKwhYear, record.heatedNetAreaM2)
        ? []
        : [
            metricValue({
              id: 'perSquareMeter',
              labelKey: key(
                'panels.energy.certificate.metric.per_square_meter'
              ),
              value: estimateValue({
                amount: record.totalKwhYear / record.heatedNetAreaM2,
                denominator: {
                  id: 'certificateHeatedNetArea',
                  areaM2: record.heatedNetAreaM2,
                },
                text: plainText(
                  formatNumber({
                    value: record.totalKwhYear / record.heatedNetAreaM2,
                    locale,
                    maximumFractionDigits: 1,
                  })
                ),
                sourceProperties: [...CERTIFICATE_SOURCE_PROPERTIES],
                unitKey: key('units.kwh_per_square_meter_year'),
                provenance: createCertificateProvenance({
                  id: ENERGYMAP_BUILDING_INFO_CERTIFICATE_PROVENANCE_IDS.CERTIFICATE_CONSUMPTION_TOTAL_PER_SQUARE_METER,
                  context,
                  additionalInputs: [
                    totalInput,
                    {
                      id: ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.heatedNetArea,
                      value: record.heatedNetAreaM2,
                    },
                    {
                      id: ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS.annualDividedByHeatedArea,
                    },
                  ],
                }),
              }),
            }),
          ]),
    ],
  }
}

/** Resolve Energy only. Pricing, emissions, Water and renovation keep their inputs. */
const resolveEnergyConsumptionControls = ({
  controls,
  totalMetric,
  heatingMetric,
  electricityMetric,
  certificate,
  referenceEnergyAvailability,
  properties,
  prefix,
  locale,
}: {
  controls: EnergymapBuildingInfoConsumptionControls
  totalMetric: EnergymapBuildingInfoMetric
  heatingMetric: EnergymapBuildingInfoMetric
  electricityMetric: EnergymapBuildingInfoMetric
  certificate: EnergyCertificateConsumptionRecord | null
  referenceEnergyAvailability: ReferenceEnergyAvailability
  properties: EnergymapSelectedBuilding['properties']
  prefix: EnergymapEnergyScenarioPrefix | null
  locale: string
}): EnergymapBuildingInfoConsumptionControls => {
  if (referenceEnergyAvailability === 'complete') return controls

  const annual = (metric: EnergymapBuildingInfoMetric) =>
    metric.values.find(
      (value) =>
        value.id === 'annualTotal' &&
        isEnergymapBuildingInfoValueAvailable(value)
    )
  const usable = (metric: EnergymapBuildingInfoMetric) =>
    normalizeMetric(metric) != null
  const choice = (
    metric: EnergymapBuildingInfoMetric
  ): EnergymapBuildingInfoEnergySubmetric => ({
    id: metric.id,
    label: metric.label,
    metric,
    supported: true,
    defaultSelected: false,
    ...(metric.label.type === 'translation'
      ? { ariaLabelKey: metric.label.keyName }
      : {}),
    ...(metric.label.type === 'plain'
      ? {
          ariaLabel: `${metric.label.text} (${Number(metric.id.slice(-1)) + 1})`,
        }
      : {}),
  })
  // Independent reference totals must survive an incomplete breakdown, even on old tiles.
  if (certificate == null) {
    const hasPair = usable(heatingMetric) && usable(electricityMetric)
    return hasPair || !usable(totalMetric)
      ? controls
      : {
          ...controls,
          combinedEnergyMetric: undefined,
          energySubmetrics: [
            choice(totalMetric),
            ...(controls.energySubmetrics ?? []),
          ],
          defaultEnergySubmetricIds: ['total'],
        }
  }

  const context = createCertificateEvidenceContext(certificate)
  const components = certificate.components.map((component) =>
    createCertificateMetric({
      component,
      context,
      heatedNetAreaM2: certificate.heatedNetAreaM2,
      locale,
    })
  )
  const coherentFallback = ({
    reference,
    fallback,
  }: {
    reference: EnergymapBuildingInfoMetric
    fallback: EnergymapBuildingInfoMetric
  }): EnergymapBuildingInfoMetric => {
    if (!usable(reference)) return fallback
    if (annual(reference) != null) return reference
    // A registry intensity is useful but cannot be paired with an unrelated
    // certificate annual numerator. One quantity, two explicit basis families.
    return {
      ...fallback,
      id: reference.id,
      label: reference.label,
      bases: [
        {
          id: 'certificateHeatedNetArea',
          label: translationText(key('panels.energy.basis.annual_heated_area')),
          values: fallback.values,
        },
        {
          id: 'registryFloorArea',
          label: translationText(key('panels.energy.basis.registry_area')),
          values: reference.values.filter(
            isEnergymapBuildingInfoValueAvailable
          ),
        },
      ],
    }
  }
  const referenceHeatAnnual = annual(heatingMetric)
  const districtIndex = components.findIndex(({ id }) => id === 'districtHeat')
  const replacesDistrictHeat =
    prefix === 'distr' && districtIndex >= 0 && referenceHeatAnnual != null
  const referenceChoices = [electricityMetric, heatingMetric].filter(usable)
  if (prefix === 'distr' && districtIndex >= 0 && usable(heatingMetric)) {
    const district = components[districtIndex]
    components[districtIndex] = coherentFallback({
      reference: heatingMetric,
      fallback: { ...district, id: 'heating', label: heatingMetric.label },
    })
    // Retained reference heat and its fallback have the same quantity identity.
    const index = referenceChoices.indexOf(heatingMetric)
    if (index >= 0) referenceChoices.splice(index, 1)
  }

  let resolvedTotal: EnergymapBuildingInfoMetric | undefined
  if (certificate.completeness === 'complete') {
    resolvedTotal = createCertificateTotalMetric({
      record: certificate,
      context,
      locale,
    })
    if (replacesDistrictHeat) {
      const heatIntensity = getEnergyNumberProperty(
        properties,
        'distr_default_heat'
      )!
      const registryArea = getPositiveNumberProperty(
        properties,
        FLOOR_AREA_PROPERTY
      )!
      const remaining = certificate.components.filter(
        ({ carrier }) => carrier !== 'district_heat'
      )
      const total = remaining.reduce(
        (sum, component) => sum + component.annualKwh,
        heatIntensity * registryArea
      )
      const input = ENERGYMAP_BUILDING_INFO_CERTIFICATE_INPUT_IDS
      const inputIds = ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS
      const operands = remaining.flatMap((component) => {
        const details = getCertificateComponentDetails(component)
        return [
          { id: details.inputId, value: component.annualKwh },
          ...(details.nameInput ? [details.nameInput] : []),
        ]
      })
      const commonInputs = [
        ...operands,
        { id: inputIds.RESOLVED_DISTRICT_HEAT_INTENSITY, value: heatIntensity },
        { id: inputIds.RESOLVED_REGISTRY_AREA, value: registryArea },
        { id: inputIds.INTENSITY_TIMES_AREA },
        { id: inputIds.RESOLVED_CARRIER_TOTAL },
      ]
      const sourceProperties = [
        ...CERTIFICATE_SOURCE_PROPERTIES,
        'distr_default_heat',
        FLOOR_AREA_PROPERTY,
      ]
      const values: EnergymapBuildingInfoMetricValue[] = []
      if (Number.isFinite(total)) {
        values.push({
          id: 'annualTotal',
          label: translationText(key('panels.energy.metric.annual_total')),
          status: 'estimate',
          amount: total,
          text: plainText(
            formatNumber({ value: total, locale, maximumFractionDigits: 1 })
          ),
          unitKey: key('units.kwh_per_year'),
          sourceProperties,
          provenance: createCertificateProvenance({
            id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.MIXED_ENERGY_ANNUAL,
            context,
            additionalInputs: commonInputs,
          }),
        })
        if (isUsableEnergyIntensity(total, certificate.heatedNetAreaM2)) {
          values.push({
            id: 'perSquareMeter',
            label: translationText(
              key('panels.energy.certificate.metric.per_square_meter')
            ),
            status: 'estimate',
            amount: total / certificate.heatedNetAreaM2!,
            denominator: {
              id: 'certificateHeatedNetArea',
              areaM2: certificate.heatedNetAreaM2!,
            },
            text: plainText(
              formatNumber({
                value: total / certificate.heatedNetAreaM2!,
                locale,
                maximumFractionDigits: 1,
              })
            ),
            unitKey: key('units.kwh_per_square_meter_year'),
            sourceProperties,
            provenance: createCertificateProvenance({
              id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.MIXED_ENERGY_INTENSITY,
              context,
              additionalInputs: [
                ...commonInputs,
                {
                  id: input.heatedNetArea,
                  value: certificate.heatedNetAreaM2!,
                },
                { id: inputIds.RESOLVED_ANNUAL_DIVIDED_BY_HEATED_AREA },
              ],
            }),
          })
        }
      }
      resolvedTotal =
        values.length === 0
          ? undefined
          : {
              id: 'total',
              label: totalMetric.label,
              values,
              coverage: {
                kind: 'total',
                complete: true,
                contributors: components.map(({ id }) => id),
              },
            }
    }
  }
  // The preferred total is independent unless this model establishes its partition.
  if (usable(totalMetric))
    resolvedTotal =
      resolvedTotal == null
        ? totalMetric
        : coherentFallback({ reference: totalMetric, fallback: resolvedTotal })
  const metrics = [
    ...(resolvedTotal ? [resolvedTotal] : []),
    ...referenceChoices,
    ...components,
  ]
  return {
    ...controls,
    combinedEnergyMetric: undefined,
    energySubmetrics: metrics.map(choice),
    defaultEnergySubmetricIds: metrics.slice(0, 1).map(({ id }) => id),
  }
}

const createEnergyConsumptionPanel = ({
  properties,
  prefix,
  locale,
  certificateConsumption,
}: {
  properties: EnergymapSelectedBuilding['properties']
  prefix: EnergymapEnergyScenarioPrefix | null
  locale: string
  certificateConsumption: EnergyCertificateConsumptionRecord | null
}): EnergymapBuildingInfoPanel => {
  const totalMetric = createEnergyMetric({
    id: 'total',
    seriesKey: key('panels.energy.series.total'),
    estimateType: 'total',
    properties,
    prefix,
    locale,
  })
  const heatingMetric = createEnergyMetric({
    id: 'heating',
    seriesKey: key('panels.energy.series.heating'),
    estimateType: 'heat',
    properties,
    prefix,
    locale,
  })
  const electricityMetric = createEnergyMetric({
    id: 'electricity',
    seriesKey: key('panels.energy.series.electricity'),
    estimateType: 'elec',
    properties,
    prefix,
    locale,
  })
  const referenceEnergyAvailability = getReferenceEnergyAvailability({
    totalMetric,
    heatingMetric,
    electricityMetric,
  })
  const electricityProperty =
    prefix == null
      ? null
      : getScenarioProperty({
          prefix,
          measure: 'default',
          estimateType: 'elec',
        })
  const heatingProperty =
    prefix == null
      ? null
      : getScenarioProperty({
          prefix,
          measure: 'default',
          estimateType: 'heat',
        })
  const currentReferenceEnergyInput = {
    scenarioPrefix: prefix,
    floorAreaSquareMeters: properties[FLOOR_AREA_PROPERTY],
    defaultElectricityIntensityKwhPerSquareMeterYear:
      electricityProperty == null ? undefined : properties[electricityProperty],
    defaultHeatingIntensityKwhPerSquareMeterYear:
      heatingProperty == null ? undefined : properties[heatingProperty],
  }
  const costMetric = createCurrentReferencePrimaryMetric({
    id: 'cost',
    result: calculateCurrentReferenceAnnualCost({
      ...currentReferenceEnergyInput,
      mainPurpose: properties[ENERGYMAP_BUILDING_TYPE_PROPERTY],
    }),
    prefix,
    energyInput: currentReferenceEnergyInput,
    properties,
    locale,
  })
  const co2Metric = createCurrentReferencePrimaryMetric({
    id: 'co2',
    result: calculateCurrentReferenceAnnualCo2(currentReferenceEnergyInput),
    prefix,
    energyInput: currentReferenceEnergyInput,
    properties,
    locale,
  })
  const waterMetric = createCurrentReferenceWaterPrimaryMetric({
    floorAreaSquareMeters: properties[FLOOR_AREA_PROPERTY],
    allowOverrideWithoutDefault: ['05', '06'].includes(
      getCodeProperty(properties, ENERGYMAP_BUILDING_TYPE_PROPERTY) ?? ''
    ),
    locale,
  })
  const consumptionControls = resolveEnergyConsumptionControls({
    controls: createConsumptionControls({
      totalMetric,
      heatingMetric,
      electricityMetric,
      waterMetric,
      costMetric,
      co2Metric,
    }),
    totalMetric,
    heatingMetric,
    electricityMetric,
    certificate: certificateConsumption,
    referenceEnergyAvailability,
    properties,
    prefix,
    locale,
  })
  const hasCostMetric = normalizePrimaryMetric(costMetric) != null
  const hasCo2Metric = normalizePrimaryMetric(co2Metric) != null
  const costInputIds = costMetric.value?.provenance?.inputIds
  const co2InputIds = co2Metric.value?.provenance?.inputIds

  return {
    id: 'energyConsumption',
    title: translationText(key('panels.energy.title')),
    description: translationText(key('panels.energy.description')),
    sections: [
      {
        id: 'estimatedConsumption',
        title: translationText(
          key('panels.energy.sections.estimated_consumption')
        ),
        metrics: [totalMetric, heatingMetric, electricityMetric],
        consumptionControls,
        notes: [
          note({
            id: 'estimatedConsumption',
            keyName: key('panels.energy.note.estimated'),
            status: 'estimate',
            provenance: {
              id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ESTIMATED_CONSUMPTION_NOTE,
              inputIds: [
                ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.MODEL_CONSUMPTION_REFERENCE,
              ],
            },
          }),
        ],
      },
      {
        id: 'calculationContext',
        title: translationText(
          key('panels.energy.sections.calculation_context')
        ),
        rows: [
          ...(hasCostMetric
            ? [
                row({
                  id: 'costMode',
                  labelKey: key('panels.energy.rows.cost_mode'),
                  value: {
                    text: translationText(
                      key('panels.energy.context.cost_current_reference')
                    ),
                    status: 'estimate',
                    ...(costMetric.value?.sourceProperties == null
                      ? {}
                      : {
                          sourceProperties: costMetric.value.sourceProperties,
                        }),
                    ...(costInputIds == null
                      ? {}
                      : {
                          provenance: {
                            id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.COST_MODE_CONTEXT,
                            inputIds: costInputIds,
                          },
                        }),
                  },
                }),
              ]
            : []),
          ...(hasCo2Metric
            ? [
                row({
                  id: 'co2Mode',
                  labelKey: key('panels.energy.rows.co2_mode'),
                  value: {
                    text: translationText(
                      key('panels.energy.context.co2_current_reference')
                    ),
                    status: 'estimate',
                    ...(co2Metric.value?.sourceProperties == null
                      ? {}
                      : {
                          sourceProperties: co2Metric.value.sourceProperties,
                        }),
                    ...(co2InputIds == null
                      ? {}
                      : {
                          provenance: {
                            id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CO2_MODE_CONTEXT,
                            inputIds: co2InputIds,
                          },
                        }),
                  },
                }),
              ]
            : []),
        ],
      },
    ],
  }
}

const getSavingsPercentValue = ({
  properties,
  prefix,
  measure,
  provenanceId,
  locale,
}: {
  properties: EnergymapSelectedBuilding['properties']
  prefix: EnergymapEnergyScenarioPrefix | null
  measure: EnergymapEnergyMeasure
  provenanceId: EnergymapBuildingInfoProvenanceId
  locale: string
}): EnergymapBuildingInfoValue => {
  if (prefix == null) {
    return getUnsupportedEstimateValue([
      HEATING_METHOD_PROPERTY,
      HEATING_ENERGY_SOURCE_PROPERTY,
    ])
  }

  const baselineProperty = getScenarioProperty({
    prefix,
    measure: 'default',
    estimateType: 'total',
  })
  const measureProperty = getScenarioProperty({
    prefix,
    measure,
    estimateType: 'total',
  })

  if (
    getEnergyReferenceCoverageExclusions({
      purpose: getCodeProperty(properties, ENERGYMAP_BUILDING_TYPE_PROPERTY),
      prefix,
      measure,
    }).length > 0
  ) {
    return placeholderValue({
      keyName: key('placeholders.not_published'),
      sourceProperties: [baselineProperty, measureProperty],
    })
  }

  const baselineValue = getEnergyNumberProperty(properties, baselineProperty)
  const measureValue = getEnergyNumberProperty(properties, measureProperty)

  if (baselineValue == null || baselineValue <= 0 || measureValue == null) {
    return missingValue({
      sourceProperties: [baselineProperty, measureProperty],
    })
  }

  const savings = (baselineValue - measureValue) / baselineValue
  if (!Number.isFinite(savings) || !Number.isFinite(savings * 100))
    return missingValue({
      sourceProperties: [baselineProperty, measureProperty],
    })
  const savingsText = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    style: 'percent',
  }).format(Math.abs(savings))
  const keyName =
    savings >= 0
      ? key('panels.renovation.savings_less')
      : key('panels.renovation.savings_more')
  const baselineInputId = getEnergymapModelOutputProvenanceInputId({
    prefix,
    measure: 'default',
    estimateType: 'total',
  })
  const measureInputId = getEnergymapModelOutputProvenanceInputId({
    prefix,
    measure,
    estimateType: 'total',
  })
  const provenance =
    baselineInputId == null || measureInputId == null
      ? undefined
      : {
          id: provenanceId,
          inputIds: [
            baselineInputId,
            measureInputId,
            ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.SCENARIO_SAVINGS,
          ],
        }

  return estimateValue({
    text: translationText(keyName, {
      percent: `${savings >= 0 ? '-' : '+'}${savingsText}`,
    }),
    sourceProperties: [baselineProperty, measureProperty],
    provenance,
    note: getEstimatedValueNote({
      valueProvenance: provenance,
      sourceProperties: [baselineProperty, measureProperty],
    }),
  })
}

const createRenovationScenario = ({
  properties,
  prefix,
  measure,
  locale,
}: {
  properties: EnergymapSelectedBuilding['properties']
  prefix: EnergymapEnergyScenarioPrefix | null
  measure: Exclude<EnergymapEnergyMeasure, 'default'>
  locale: string
}): EnergymapBuildingInfoScenario => {
  const provenanceIds = RENOVATION_SCENARIO_PROVENANCE_IDS[measure]

  return {
    id: measure,
    label: translationText(key(`panels.renovation.measures.${measure}`)),
    values: [
      metricValue({
        id: 'annualTotal',
        labelKey: key('panels.energy.metric.annual_total'),
        value: getAnnualEstimateValue({
          properties,
          prefix,
          measure,
          estimateType: 'total',
          provenanceId: provenanceIds.annualTotal,
          locale,
        }),
      }),
      metricValue({
        id: 'perSquareMeter',
        labelKey: key('panels.energy.metric.per_square_meter'),
        value: getPerSquareMeterEstimateValue({
          properties,
          prefix,
          measure,
          estimateType: 'total',
          provenanceId: provenanceIds.perSquareMeter,
          locale,
        }),
      }),
      metricValue({
        id: 'savingsPercent',
        labelKey: key('panels.renovation.metric.savings'),
        value: getSavingsPercentValue({
          properties,
          prefix,
          measure,
          provenanceId: provenanceIds.savingsPercent,
          locale,
        }),
      }),
    ],
  }
}

const createRenovationRecommendationsPanel = ({
  properties,
  prefix,
  locale,
}: {
  properties: EnergymapSelectedBuilding['properties']
  prefix: EnergymapEnergyScenarioPrefix | null
  locale: string
}): EnergymapBuildingInfoPanel => ({
  id: 'renovationRecommendations',
  title: translationText(key('panels.renovation.title')),
  description: translationText(key('panels.renovation.description')),
  sections: [
    {
      id: 'publishedRecommendations',
      rows: [
        row({
          id: 'energyCertificateRecommendations',
          labelKey: key(
            'panels.renovation.sections.energy_certificate_recommendations'
          ),
          value: getEnergyCertificateRecommendationsValue(properties),
          presentation: 'expandableSourceText',
        }),
      ],
    },
    {
      id: 'scenarioComparison',
      title: translationText(
        key('panels.renovation.sections.scenario_comparison')
      ),
      description: translationText(
        key('panels.renovation.scenario_comparison_description')
      ),
      scenarios: (['aahp', 'solar', 'windows'] as const).map((measure) =>
        createRenovationScenario({
          properties,
          prefix,
          measure,
          locale,
        })
      ),
    },
  ],
})

const createBuildingDetailsPanel = ({
  properties,
  locale,
}: {
  properties: EnergymapSelectedBuilding['properties']
  locale: string
}): EnergymapBuildingInfoPanel => ({
  id: 'buildingDetails',
  title: translationText(key('panels.building.title')),
  sections: [
    {
      id: 'buildingSubheader',
      variant: 'buildingSubheader',
      rows: [
        row({
          id: 'address',
          labelKey: key('panels.building.rows.address'),
          value: getAddressValue(properties),
        }),
      ],
    },
    {
      id: 'identity',
      rows: [
        row({
          id: 'buildingIdentifier',
          labelKey: key('panels.building.rows.building_identifier'),
          value: getStringValue({
            properties,
            propertyName: PERMANENT_BUILDING_IDENTIFIER_PROPERTY,
            provenance: {
              id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_IDENTIFIER,
              inputIds: [
                ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_BUILDING_IDENTIFIER,
              ],
            },
          }),
        }),
        row({
          id: 'propertyIdentifier',
          labelKey: key('panels.building.rows.property_identifier'),
          value: getPropertyIdentifierValue(properties),
        }),
        row({
          id: 'constructionYear',
          labelKey: key('panels.building.rows.construction_year'),
          value: getYearValue(properties),
        }),
        row({
          id: 'buildingType',
          labelKey: key('panels.building.rows.building_type'),
          value: getCodeLabelValue({
            codeValue: getCodeProperty(
              properties,
              ENERGYMAP_BUILDING_TYPE_PROPERTY
            ),
            codeType: 'main_purpose',
            knownCodes: ENERGYMAP_BUILDING_TYPE_CODES,
            sourceProperty: ENERGYMAP_BUILDING_TYPE_PROPERTY,
            provenance: {
              id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.BUILDING_TYPE,
              inputIds: [
                ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.RYHTI_BUILDING_TYPE,
                ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.LOCALIZE_BUILDING_TYPE,
              ],
            },
          }),
        }),
      ],
    },
    {
      id: 'energyCertificate',
      variant: 'energyCertificate',
      rows: [
        row({
          id: 'energyClass',
          labelKey: key('panels.building.rows.energy_class'),
          value: getEnergyClassValue({
            properties,
            propertyName: ENERGY_CLASS_PROPERTY,
            provenance: getCurrentEnergyClassProvenance(properties),
            sourceProperties: getCurrentEnergyClassSourceProperties(properties),
          }),
          modeledIndicator: getModeledEnergyClassIndicator(properties),
        }),
        row({
          id: 'energyCertificateValidity',
          labelKey: key('panels.building.rows.energy_certificate_validity'),
          value: getEnergyCertificateValidityValue({ properties, locale }),
        }),
      ],
    },
    {
      id: 'previousEnergyClass',
      variant: 'previousEnergyClass',
      rows: [
        row({
          id: 'previousEnergyClass',
          labelKey: key('panels.building.rows.previous_energy_class'),
          value: getEnergyClassValue({
            properties,
            propertyName: ENERGY_CERTIFICATE_PREVIOUS_CLASS_PROPERTY,
            provenance: {
              id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.PREVIOUS_ENERGY_CLASS,
              inputIds: [
                ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_PREVIOUS_CLASS,
              ],
            },
          }),
        }),
      ],
    },
    {
      id: 'technicalDetails',
      rows: [
        row({
          id: 'heating',
          labelKey: key('panels.building.rows.heating'),
          value: getHeatingValue(properties),
        }),
        row({
          id: 'heatedNetArea',
          labelKey: key('panels.building.rows.heated_net_area'),
          value: getMeasurementValue({
            properties,
            propertyName: ENERGY_CERTIFICATE_HEATED_NET_AREA_PROPERTY,
            unitKey: key('units.square_meters'),
            provenance: {
              id: ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.HEATED_NET_AREA,
              inputIds: [
                ENERGYMAP_BUILDING_INFO_PROVENANCE_INPUT_IDS.CERTIFICATE_HEATED_NET_AREA,
              ],
            },
            locale,
          }),
        }),
        row({
          id: 'ventilationType',
          labelKey: key('panels.building.rows.ventilation_type'),
          value: getVentilationTypeValue(properties),
        }),
        row({
          id: 'ventilation',
          labelKey: key('panels.building.rows.ventilation'),
          value: getVentilationValue(properties),
        }),
        row({
          id: 'ventilationCategory',
          labelKey: key('panels.building.rows.ventilation_category'),
          value: getVentilationCategoryValue(properties),
        }),
      ],
    },
  ],
})

const metricHasEstimate = (metric: EnergymapBuildingInfoMetric) =>
  metric.values.some((value) => value.status === 'estimate')

const controlsHaveEstimate = (
  controls: EnergymapBuildingInfoConsumptionControls
) =>
  controls.primaryMetrics.some(
    (metric) => metric.value?.status === 'estimate'
  ) ||
  (controls.energySubmetrics ?? []).some((submetric) =>
    metricHasEstimate(submetric.metric)
  )

const CURRENT_CONSUMPTION_MODEL_OUTPUT_PROVENANCE_IDS =
  new Set<EnergymapBuildingInfoProvenanceId>([
    ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_TOTAL_ANNUAL,
    ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_TOTAL_PER_SQUARE_METER,
    ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_HEATING_ANNUAL,
    ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_HEATING_PER_SQUARE_METER,
    ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_ELECTRICITY_ANNUAL,
    ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.CURRENT_ELECTRICITY_PER_SQUARE_METER,
  ])

const metricHasConsumptionModelOutput = (metric: EnergymapBuildingInfoMetric) =>
  metric.values.some(
    (value) =>
      value.provenance != null &&
      CURRENT_CONSUMPTION_MODEL_OUTPUT_PROVENANCE_IDS.has(value.provenance.id)
  )

const controlsHaveConsumptionModelOutput = (
  controls: EnergymapBuildingInfoConsumptionControls
) =>
  (controls.energySubmetrics ?? []).some((submetric) =>
    metricHasConsumptionModelOutput(submetric.metric)
  ) ||
  (controls.combinedEnergyMetric != null &&
    metricHasConsumptionModelOutput(controls.combinedEnergyMetric))

const normalizeSection = (
  candidate: EnergymapBuildingInfoSection
): EnergymapBuildingInfoSection | null => {
  const rows = (candidate.rows ?? [])
    .map(normalizeRow)
    .filter((item): item is EnergymapBuildingInfoRow => item != null)
  const metrics = (
    candidate.consumptionControls == null ? (candidate.metrics ?? []) : []
  )
    .map(normalizeMetric)
    .filter((item): item is EnergymapBuildingInfoMetric => item != null)
  const scenarios = (candidate.scenarios ?? [])
    .map(normalizeScenario)
    .filter((item): item is EnergymapBuildingInfoScenario => item != null)
  const consumptionControls = normalizeConsumptionControls(
    candidate.consumptionControls
  )
  const hasData =
    rows.length > 0 ||
    metrics.length > 0 ||
    scenarios.length > 0 ||
    consumptionControls != null

  if (!hasData) {
    return null
  }

  const hasEstimate =
    rows.some((item) => item.status === 'estimate') ||
    metrics.some(metricHasEstimate) ||
    scenarios.some((scenario) =>
      scenario.values.some((value) => value.status === 'estimate')
    ) ||
    (consumptionControls != null && controlsHaveEstimate(consumptionControls))
  const hasConsumptionModelOutput =
    metrics.some(metricHasConsumptionModelOutput) ||
    (consumptionControls != null &&
      controlsHaveConsumptionModelOutput(consumptionControls))
  const notes = (candidate.notes ?? [])
    .map(normalizeNote)
    .filter(
      (item): item is EnergymapBuildingInfoNote =>
        item != null &&
        (item.status !== 'estimate' ||
          (item.provenance?.id ===
          ENERGYMAP_BUILDING_INFO_PROVENANCE_IDS.ESTIMATED_CONSUMPTION_NOTE
            ? hasConsumptionModelOutput
            : hasEstimate))
    )
  const title = normalizeEnergymapBuildingInfoText(candidate.title)
  const description = normalizeEnergymapBuildingInfoText(candidate.description)
  const {
    title: _title,
    titleSourceProperties,
    titleProvenance,
    description: _description,
    rows: _rows,
    metrics: _metrics,
    scenarios: _scenarios,
    notes: _notes,
    consumptionControls: _consumptionControls,
    ...sectionWithoutContent
  } = candidate

  return {
    ...sectionWithoutContent,
    ...(title == null
      ? {}
      : {
          title,
          ...(titleSourceProperties == null ? {} : { titleSourceProperties }),
          ...(titleProvenance == null ? {} : { titleProvenance }),
        }),
    ...(description == null ? {} : { description }),
    ...(rows.length === 0 ? {} : { rows }),
    ...(metrics.length === 0 ? {} : { metrics }),
    ...(consumptionControls == null ? {} : { consumptionControls }),
    ...(scenarios.length === 0 ? {} : { scenarios }),
    ...(notes.length === 0 ? {} : { notes }),
  }
}

const normalizePanel = (
  candidate: EnergymapBuildingInfoPanel
): EnergymapBuildingInfoPanel | null => {
  const title = normalizeEnergymapBuildingInfoText(candidate.title)
  const sections = candidate.sections
    .map(normalizeSection)
    .filter(
      (section): section is EnergymapBuildingInfoSection => section != null
    )

  if (title == null || sections.length === 0) {
    return null
  }

  const description = normalizeEnergymapBuildingInfoText(candidate.description)
  const { description: _description, ...panelWithoutDescription } = candidate

  return {
    ...panelWithoutDescription,
    title,
    sections,
    ...(description == null ? {} : { description }),
  }
}

export const createEnergymapBuildingInfoPresentation = ({
  selectedBuilding,
  locale,
}: CreateEnergymapBuildingInfoPanelsOptions): EnergymapBuildingInfoPresentation => {
  if (selectedBuilding == null) {
    return { panels: null, missingData: null }
  }

  const { properties } = selectedBuilding
  const certificateOutcome =
    parseEnergyCertificateConsumptionOutcome(properties)
  const certificateConsumption =
    certificateOutcome.status === 'available' ? certificateOutcome.record : null
  const heatingMethod = getCodeProperty(properties, HEATING_METHOD_PROPERTY)
  const heatingEnergySource = getCodeProperty(
    properties,
    HEATING_ENERGY_SOURCE_PROPERTY
  )
  const prefix = resolveCurrentEnergyScenarioPrefix({
    heatingEnergySource,
    heatingMethod,
  })

  const candidates = [
    createEnergyConsumptionPanel({
      properties,
      prefix,
      locale,
      certificateConsumption,
    }),
    createRenovationRecommendationsPanel({ properties, prefix, locale }),
    createBuildingDetailsPanel({ properties, locale }),
  ]
  const missingData = {
    locale,
    ...collectMissingBuildingInfo({
      candidates,
      properties,
      prefix,
      certificateOutcome,
    }),
  }
  return {
    panels: candidates
      .map(normalizePanel)
      .filter((panel): panel is EnergymapBuildingInfoPanel => panel != null),
    missingData,
  }
}

export const createEnergymapBuildingInfoPanels = (
  options: CreateEnergymapBuildingInfoPanelsOptions
): EnergymapBuildingInfoPanel[] | null =>
  createEnergymapBuildingInfoPresentation(options).panels
