import {
  calculateCurrentReferenceAnnualWater,
  deriveCurrentReferenceResidentCount,
} from './currentReferenceCalculations'
import { CURRENT_REFERENCE_DATA } from './currentReferenceData'
import type {
  EnergymapBuildingInfoMissingItem,
  EnergymapBuildingInfoPanel,
  EnergymapBuildingInfoPanelId,
  EnergymapBuildingInfoText,
  EnergymapBuildingInfoValue,
  EnergymapEnergyMeasure,
  EnergymapEnergyScenarioPrefix,
} from './buildingInfo'
import type { EnergymapBuildingInfoProvenanceSourceId } from './buildingInfoProvenance'
import type { CurrentReferenceUnsupportedResult } from './currentReferenceCalculations'
import type { EnergyCertificateConsumptionOutcome } from './energyCertificateConsumption'
import {
  ENERGY_CERTIFICATE_STANDARD_CARRIERS,
  ENERGY_CERTIFICATE_CONSUMPTION_FAILURES,
} from './energyCertificateConsumption'
import {
  getCodeProperty,
  getStringProperty,
  getNumberProperty,
  getPositiveNumberProperty,
  getEnergyNumberProperty,
  formatYearFromDate,
  isUsableEnergyIntensity,
  getEnergyReferenceCoverageExclusions,
} from './buildingInfoEvidence'
import type { EnergymapSelectedBuildingProperties } from './types'

export type BuildingInfoMissingReasonKind =
  | 'source-field-absent'
  | 'source-record-unmatched'
  | 'missing-join-identifier'
  | 'unsupported-building'
  | 'unsupported-heating'
  | 'unsupported-scenario'
  | 'missing-reference-factor'
  | 'invalid-supplied-input'
  | 'incomplete-calculation'
  | 'unusable-published-payload'
  | 'legacy-cause-unestablished'

/** Local evidence only. No wire diagnostic or source-match outcome is inferred from omission. */
export type BuildingInfoMissingReason = {
  source: EnergymapBuildingInfoProvenanceSourceId | 'userResidentCount'
  field: string
  kind: BuildingInfoMissingReasonKind
  code: string
  evidence:
    | 'published-field'
    | 'modeled-class-reason'
    | 'reference-coverage'
    | 'calculation'
    | 'parser'
    | 'user-input'
  receivedState?: 'omitted' | 'blank' | 'invalid'
  dependencies?: readonly BuildingInfoMissingReason[]
  calculation?: CurrentReferenceUnsupportedResult
  context?: Readonly<Record<string, unknown>>
}
export type BuildingInfoFieldResolution = {
  id: string
  status: 'available' | 'missing' | 'excluded'
  basis?: string
}

const R = 'ryhtiBuildingData'
const C = 'energyCertificateRegister'
const M = 'energyMapConsumptionModel'
const K = 'energyMapModeledClass'

// Canonical table inventory: properties are evidence, never rendered product copy.
export const BUILDING_INFO_DETAIL_FIELDS = {
  address: {
    source: R,
    properties: ['address_fin', 'postal_code', 'postal_office_fin'],
  },
  'address.street': { source: R, properties: ['address_fin'] },
  'address.postalCode': { source: R, properties: ['postal_code'] },
  'address.postalOffice': { source: R, properties: ['postal_office_fin'] },
  buildingIdentifier: {
    source: R,
    properties: ['permanent_building_identifier'],
  },
  propertyIdentifier: { source: R, properties: ['property_identifier'] },
  constructionYear: { source: R, properties: ['completion_date'] },
  buildingType: { source: R, properties: ['main_purpose'] },
  heating: {
    source: R,
    properties: ['heating_energy_source', 'heating_method'],
  },
  'heating.source': { source: R, properties: ['heating_energy_source'] },
  'heating.method': { source: R, properties: ['heating_method'] },
  energyClass: {
    source: 'energyMapSelectedBuildingDataset',
    properties: ['energy_class'],
  },
  energyCertificateValidity: {
    source: C,
    properties: ['energy_certificate_valid_until'],
  },
  previousEnergyClass: {
    source: C,
    properties: ['energy_certificate_previous_class'],
  },
  heatedNetArea: {
    source: C,
    properties: ['energy_certificate_heated_net_area'],
  },
  ventilationType: {
    source: C,
    properties: [
      'energy_certificate_ventilation_type_label_fi',
      'energy_certificate_ventilation_type_label_sv',
    ],
  },
  ventilation: {
    source: C,
    properties: [
      'energy_certificate_ventilation_description_fi',
      'energy_certificate_ventilation_description_sv',
    ],
  },
  ventilationCategory: {
    source: 'energyMapVentilationGrouping',
    properties: ['ventilation_category'],
  },
  energyCertificateRecommendations: {
    source: C,
    properties: [
      'energy_certificate_recommendations_fi',
      'energy_certificate_recommendations_sv',
    ],
  },
  floorArea: { source: R, properties: ['floor_area'] },
  storeys: { source: R, properties: ['number_of_storeys'] },
} as const

type DetailField = keyof typeof BUILDING_INFO_DETAIL_FIELDS
export const BUILDING_INFO_EXCLUSIONS = {
  waterHeating: 'no-approved-separation-method',
  generalRenovationRecommendations: 'no-general-recommendation-dataset',
  generalEnergyRecommendations: 'no-approved-recommendation-source',
  energyClassImprovement: 'no-measure-to-class-contract',
  plannedMeasures: 'no-linked-works-dataset',
  plotTenure: 'no-tenure-source',
  duplicateContext: 'context-is-not-a-product-quantity',
} as const

const tr = (name: string): EnergymapBuildingInfoText => ({
  type: 'translation',
  keyName: `sidebar.building_info.${name}`,
})
const sequence = (
  parts: EnergymapBuildingInfoText[],
  separator = ' '
): EnergymapBuildingInfoText =>
  parts.length === 1 ? parts[0] : { type: 'sequence', parts, separator }
const available = (value: EnergymapBuildingInfoValue | undefined) =>
  value?.status === 'real' || value?.status === 'estimate'
const present = (value: unknown) =>
  value != null && !(typeof value === 'string' && value.trim() === '')

const cause = ({
  source,
  field,
  code,
  kind = 'incomplete-calculation',
  dependencies,
}: Pick<
  BuildingInfoMissingReason,
  'source' | 'field' | 'code' | 'dependencies'
> & { kind?: BuildingInfoMissingReasonKind }): BuildingInfoMissingReason => ({
  source,
  field,
  code,
  kind,
  evidence: 'calculation',
  ...(dependencies?.length ? { dependencies } : {}),
})
const fieldReason = (
  field: DetailField,
  properties: EnergymapSelectedBuildingProperties
): BuildingInfoMissingReason => {
  const config = BUILDING_INFO_DETAIL_FIELDS[field]
  const raw = config.properties.map((property) => properties[property])
  const invalid = raw.some(present)
  const source =
    field === 'energyClass'
      ? properties.is_energy_class_modeled === true
        ? K
        : properties.is_energy_class_modeled === false
          ? C
          : config.source
      : config.source
  return {
    source,
    field,
    code: invalid ? 'invalid' : 'legacy',
    kind: invalid ? 'invalid-supplied-input' : 'legacy-cause-unestablished',
    evidence: 'published-field',
    receivedState: invalid
      ? 'invalid'
      : raw.some((value) => value != null)
        ? 'blank'
        : 'omitted',
  }
}

const CAUSE_CODES = [
  'annual',
  'savings',
  'arithmetic',
  'unsupported-building',
  'unsupported-heating',
  'unsupported-aahp',
  'reference-output',
  'invalid-output',
  'baseline-missing',
  'baseline-invalid',
  'baseline-nonpositive',
  'official-class',
  'class-unknown',
  'class-area',
  'class-small-area',
  'class-reference',
  'class-storeys',
  'class-completion',
  'class-unsupported',
  'class-purpose',
  'class-heating',
  'ventilation-known-code',
  'ventilation-unknown-code',
  'ventilation-no-info',
  'ventilation-classification',
  'certificate-absent',
  'certificate-join',
  'certificate-carrier',
  'certificate-total',
  'certificate-area-absent',
  'certificate-area-invalid',
  'certificate-intensity',
  'cost',
  'co2',
  'apartment-pellet-price',
  'price-factor',
  'emission-factor',
  'invalid-price-factor',
  'invalid-emission-factor',
  'water-default',
  'water-empty',
  'water-invalid',
  'water-range',
] as const
const sourceFallback = (source: BuildingInfoMissingReason['source']) =>
  source === R
    ? 'ryhti'
    : source === C
      ? 'certificate'
      : source === K
        ? 'class'
        : source === 'energyMapSelectedBuildingDataset'
          ? 'classOrigin'
          : source === 'userResidentCount'
            ? 'water'
            : 'reference'

/** Total localized projection: unknown future local codes cannot leak into product prose. */
export const projectBuildingInfoMissingReason = (
  reason: BuildingInfoMissingReason
): EnergymapBuildingInfoText => {
  let text: EnergymapBuildingInfoText
  if (
    (reason.code === 'legacy' || reason.code === 'invalid') &&
    Object.hasOwn(BUILDING_INFO_DETAIL_FIELDS, reason.field)
  ) {
    const code =
      reason.field === 'energyClass' && reason.code === 'invalid'
        ? reason.source === K
          ? 'invalidModeled'
          : reason.source === C
            ? 'invalid'
            : 'invalidUnknownOrigin'
        : reason.code
    text = tr(`missing_reason.fields.${reason.field}.${code}`)
  } else if (
    (reason.code === 'reference-output' || reason.code === 'invalid-output') &&
    /^(default\.(total|heat|elec)|(aahp|solar|windows)\.total)$/.test(
      reason.field
    )
  ) {
    text = tr(`missing_reason.outputs.${reason.field}.${reason.code}`)
  } else if (
    reason.code === 'certificate-carrier' &&
    (ENERGY_CERTIFICATE_STANDARD_CARRIERS as readonly string[]).includes(
      reason.field
    )
  ) {
    text = tr(`missing_reason.carriers.${reason.field}`)
  } else if (
    reason.evidence === 'parser' &&
    reason.kind === 'unusable-published-payload' &&
    (ENERGY_CERTIFICATE_CONSUMPTION_FAILURES as readonly string[]).includes(
      reason.code
    )
  ) {
    // Only typed failures emitted by the single strict parser reach this branch.
    text = tr(`missing_reason.payload.${reason.code}`)
  } else if ((CAUSE_CODES as readonly string[]).includes(reason.code)) {
    text = tr(`missing_reason.causes.${reason.code}`)
  } else if (reason.source === 'energyMapVentilationGrouping') {
    text = tr('missing_reason.fields.ventilationCategory.legacy')
  } else {
    text = tr(`missing_reason.fallback.${sourceFallback(reason.source)}`)
  }
  return sequence([
    text,
    ...(reason.dependencies ?? []).map(projectBuildingInfoMissingReason),
  ])
}

const coverageReasons = ({
  properties,
  prefix,
  measure,
}: {
  properties: EnergymapSelectedBuildingProperties
  prefix: EnergymapEnergyScenarioPrefix | null
  measure: EnergymapEnergyMeasure
}): BuildingInfoMissingReason[] => {
  const reasons: BuildingInfoMissingReason[] = []
  const purpose = getCodeProperty(properties, 'main_purpose')
  const source = getCodeProperty(properties, 'heating_energy_source')
  const method = getCodeProperty(properties, 'heating_method')
  if (purpose == null) reasons.push(fieldReason('buildingType', properties))
  if (source == null) reasons.push(fieldReason('heating.source', properties))
  if (source === '04' && method == null)
    reasons.push(fieldReason('heating.method', properties))
  if (prefix == null && source != null && (source !== '04' || method != null)) {
    reasons.push({
      ...cause({
        source: M,
        field: 'heating',
        code: 'unsupported-heating',
        kind: 'unsupported-heating',
      }),
      evidence: 'reference-coverage',
    })
  }
  for (const code of getEnergyReferenceCoverageExclusions({
    purpose,
    prefix,
    measure,
  })) {
    reasons.push({
      ...cause({
        source: M,
        field:
          code === 'unsupported-building'
            ? 'buildingType'
            : code === 'unsupported-heating'
              ? 'heating'
              : measure,
        code,
        kind: code === 'unsupported-aahp' ? 'unsupported-scenario' : code,
      }),
      evidence: 'reference-coverage',
    })
  }
  if (formatYearFromDate(properties.completion_date) == null)
    reasons.push(fieldReason('constructionYear', properties))
  return reasons
}

const referenceOutputReason = ({
  properties,
  prefix,
  measure,
  quantity,
}: {
  properties: EnergymapSelectedBuildingProperties
  prefix: EnergymapEnergyScenarioPrefix | null
  measure: EnergymapEnergyMeasure
  quantity: 'total' | 'heat' | 'elec'
}): BuildingInfoMissingReason | null => {
  const property = prefix == null ? null : `${prefix}_${measure}_${quantity}`
  const usable =
    property != null && getEnergyNumberProperty(properties, property) != null
  const invalid =
    !usable && property != null && present(properties[property])
      ? cause({
          source: M,
          field: `${measure}.${quantity}`,
          code: 'invalid-output',
          kind: 'invalid-supplied-input',
        })
      : null
  const dependencies = coverageReasons({ properties, prefix, measure })
  const unsupported = dependencies.find(
    (reason) => reason.evidence === 'reference-coverage'
  )
  if (unsupported != null)
    return {
      ...unsupported,
      field: `${measure}.${quantity}`,
      dependencies: [
        ...dependencies.filter((reason) => reason !== unsupported),
        ...(invalid == null ? [] : [invalid]),
      ],
    }

  if (usable) return null
  // Local validation does not establish the upstream origin of an invalid value.
  if (invalid != null) return invalid

  return cause({
    source: M,
    field: `${measure}.${quantity}`,
    code: 'reference-output',
    kind: 'legacy-cause-unestablished',
    dependencies: dependencies,
  })
}

const modelClassReason = (
  properties: EnergymapSelectedBuildingProperties
): BuildingInfoMissingReason => {
  const code = properties.modeled_energy_class_reason
  let result: BuildingInfoMissingReason
  if (code === 'unsupported_building_purpose') {
    result =
      getCodeProperty(properties, 'main_purpose') == null
        ? cause({
            source: K,
            field: 'energyClass',
            code: 'class-purpose',
            kind: 'incomplete-calculation',
            dependencies: [fieldReason('buildingType', properties)],
          })
        : ['05', '06'].includes(getCodeProperty(properties, 'main_purpose')!)
          ? cause({
              source: K,
              field: 'energyClass',
              code: 'class-unknown',
              kind: 'legacy-cause-unestablished',
            })
          : cause({
              source: K,
              field: 'energyClass',
              code: 'class-unsupported',
              kind: 'unsupported-building',
            })
  } else if (code === 'missing_completion_date') {
    result = cause({
      source: K,
      field: 'energyClass',
      code: 'class-completion',
      kind: 'incomplete-calculation',
      dependencies:
        formatYearFromDate(properties.completion_date) == null
          ? [fieldReason('constructionYear', properties)]
          : [],
    })
  } else if (code === 'unsupported_heating_source') {
    const source = getCodeProperty(properties, 'heating_energy_source')
    const dependencies = [
      ...(source == null ? [fieldReason('heating.source', properties)] : []),
      ...(source === '04' &&
      getCodeProperty(properties, 'heating_method') == null
        ? [fieldReason('heating.method', properties)]
        : []),
    ]
    result = cause({
      source: K,
      field: 'energyClass',
      code: 'class-heating',
      kind: dependencies.length
        ? 'incomplete-calculation'
        : 'unsupported-heating',
      dependencies: dependencies,
    })
  } else if (code === 'missing_heated_area')
    result = cause({ source: K, field: 'energyClass', code: 'class-area' })
  else if (code === 'heated_area_below_50_m2')
    result = cause({
      source: K,
      field: 'energyClass',
      code: 'class-small-area',
      kind: 'unsupported-building',
    })
  else if (code === 'missing_number_of_storeys')
    result = cause({
      source: K,
      field: 'energyClass',
      code: 'class-storeys',
      kind: 'incomplete-calculation',
      dependencies:
        getPositiveNumberProperty(properties, 'number_of_storeys') == null
          ? [fieldReason('storeys', properties)]
          : [],
    })
  else if (code === 'missing_reference_value')
    result = cause({
      source: K,
      field: 'energyClass',
      code: 'class-reference',
      kind: 'missing-reference-factor',
    })
  else
    result = cause({
      source: K,
      field: 'energyClass',
      code: 'class-unknown',
      kind: 'legacy-cause-unestablished',
    })
  return {
    ...result,
    evidence: 'modeled-class-reason',
    context: {
      establishedCode: code,
      areaSource: properties.modeled_energy_class_area_source,
      floorArea: properties.floor_area,
      totalArea: properties.total_area,
      grossArea: properties.gross_floor_area,
      storeys: properties.number_of_storeys,
    },
  }
}

const detailReason = (
  field: DetailField,
  properties: EnergymapSelectedBuildingProperties
): BuildingInfoMissingReason => {
  if (field === 'energyClass') {
    const identity = properties.permanent_building_identifier
    return cause({
      source: C,
      field: field,
      code: 'official-class',
      kind: 'legacy-cause-unestablished',
      dependencies: [
        ...(present(properties.energy_class)
          ? [fieldReason('energyClass', properties)]
          : []),
        ...(typeof identity !== 'string' || identity.length === 0
          ? [
              cause({
                source: C,
                field: field,
                code: 'certificate-join',
                kind: 'missing-join-identifier',
              }),
            ]
          : []),
        modelClassReason(properties),
      ],
    })
  }
  if (field === 'ventilationType') {
    const base = fieldReason(field, properties)
    if (base.kind === 'invalid-supplied-input') return base
    const code = properties.energy_certificate_ventilation_type_id
    if (typeof code === 'string' && code.trim() !== '') {
      return cause({
        source: C,
        field: field,
        code: /^[0-8]$/.test(code)
          ? 'ventilation-known-code'
          : 'ventilation-unknown-code',
        kind: 'legacy-cause-unestablished',
      })
    }
    return base
  }
  if (field === 'ventilationCategory') {
    if (properties.ventilation_category === 'no_info')
      return cause({
        source: 'energyMapVentilationGrouping',
        field: field,
        code: 'ventilation-no-info',
        kind: 'legacy-cause-unestablished',
      })
    if (
      [
        'energy_certificate_ventilation_type_id',
        ...BUILDING_INFO_DETAIL_FIELDS.ventilation.properties,
      ].some((property) => getStringProperty(properties, property) != null)
    ) {
      return cause({
        source: 'energyMapVentilationGrouping',
        field: field,
        code: 'ventilation-classification',
        kind: 'legacy-cause-unestablished',
      })
    }
  }
  return fieldReason(field, properties)
}

const calculationReason = ({
  id,
  failure,
  properties,
  prefix,
}: {
  id: 'cost' | 'co2'
  failure?: CurrentReferenceUnsupportedResult
  properties: EnergymapSelectedBuildingProperties
  prefix: EnergymapEnergyScenarioPrefix | null
}): BuildingInfoMissingReason => {
  const source =
    id === 'cost' ? 'currentReferencePrices' : 'currentReferenceEmissionFactors'
  const leaves = (
    result: CurrentReferenceUnsupportedResult
  ): readonly CurrentReferenceUnsupportedResult[] =>
    result.causes?.length ? result.causes.flatMap(leaves) : [result]
  const failures = failure == null ? [] : leaves(failure)
  const dependencies: BuildingInfoMissingReason[] = []
  for (const result of failures) {
    if (result.field === 'factorPerMwh') {
      const missing =
        result.reason === 'missing-input' ||
        result.reason === 'unsupported-reference-value'
      const pellet =
        id === 'cost' &&
        failure?.context?.buildingClass === 'apartmentBuilding' &&
        failure.context.heatingCarrier === 'pellet' &&
        result.referenceReason === 'not-supplied'
      dependencies.push(
        cause({
          source: source,
          field: id,
          code: pellet
            ? 'apartment-pellet-price'
            : `${missing ? '' : 'invalid-'}${id === 'cost' ? 'price' : 'emission'}-factor`,
          kind: missing ? 'missing-reference-factor' : 'invalid-supplied-input',
        })
      )
    } else if (result.field === 'mainPurpose') {
      dependencies.push(
        getCodeProperty(properties, 'main_purpose') == null
          ? fieldReason('buildingType', properties)
          : cause({
              source: source,
              field: id,
              code: 'unsupported-building',
              kind: 'unsupported-building',
            })
      )
    } else if (
      result.reason === 'non-finite-result' ||
      result.reason === 'non-representable-result'
    )
      dependencies.push(
        cause({
          source: source,
          field: id,
          code: 'arithmetic',
          kind: 'invalid-supplied-input',
        })
      )
  }
  // Preserve independently known operands even when a calculator short-circuits.
  if (
    typeof properties.floor_area !== 'number' ||
    !Number.isFinite(properties.floor_area) ||
    properties.floor_area <= 0
  )
    dependencies.push(fieldReason('floorArea', properties))
  for (const quantity of ['heat', 'elec'] as const) {
    const property = prefix == null ? null : `${prefix}_default_${quantity}`
    const raw = property == null ? undefined : properties[property]
    if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) continue
    const reason = referenceOutputReason({
      properties,
      prefix,
      measure: 'default',
      quantity,
    })
    dependencies.push(
      reason ??
        cause({
          source: M,
          field: `default.${quantity}`,
          code: 'invalid-output',
          kind: 'invalid-supplied-input',
        })
    )
  }
  if (prefix == null && dependencies.length === 0)
    dependencies.push(
      ...coverageReasons({ properties, prefix, measure: 'default' })
    )
  return {
    ...cause({
      source: source,
      field: id,
      code: id,
      kind: 'incomplete-calculation',
      dependencies: dependencies,
    }),
    calculation: failure,
  }
}

export type EffectiveWaterInput =
  | { origin: 'default'; floorArea?: unknown; residentCount?: number }
  | { origin: 'override'; rawValue: string | number | null }

export const resolveWaterMissingReason = (
  input: EffectiveWaterInput
): BuildingInfoMissingReason | null => {
  if (input.origin === 'override') {
    const raw = input.rawValue
    if (raw == null || (typeof raw === 'string' && raw.trim() === ''))
      return {
        ...cause({
          source: 'userResidentCount',
          field: 'water',
          code: 'water-empty',
          kind: 'invalid-supplied-input',
        }),
        evidence: 'user-input',
      }
    const number = typeof raw === 'number' ? raw : Number(raw)
    if (calculateCurrentReferenceAnnualWater(number).status === 'complete') {
      return null
    }
    const { minimumResidents, maximumResidents } =
      CURRENT_REFERENCE_DATA.water.occupancy
    // Validation belongs to the calculator; only classify its rejected input for copy.
    const code =
      Number.isInteger(number) &&
      (number < minimumResidents || number > maximumResidents)
        ? 'water-range'
        : 'water-invalid'
    return {
      ...cause({
        source: 'userResidentCount',
        field: 'water',
        code: code,
        kind: 'invalid-supplied-input',
      }),
      evidence: 'user-input',
    }
  }
  if (
    calculateCurrentReferenceAnnualWater(input.residentCount).status === 'complete'
  )
    return null
  if (deriveCurrentReferenceResidentCount(input.floorArea).status === 'complete')
    return null
  return cause({
    source: 'currentReferenceOccupancy',
    field: 'water',
    code: 'water-default',
    kind: 'incomplete-calculation',
    dependencies: [fieldReason('floorArea', { floor_area: input.floorArea })],
  })
}

/** Shared value/reason boundary, including overrides when the default cannot be derived. */
export const resolveEffectiveWaterOutcome = (input: EffectiveWaterInput) => {
  const missingReason = resolveWaterMissingReason(input)
  const defaultResult =
    input.origin === 'default' && input.residentCount == null
      ? deriveCurrentReferenceResidentCount(input.floorArea)
      : null
  const count =
    input.origin === 'override'
      ? missingReason == null
        ? Number(input.rawValue)
        : null
      : (input.residentCount ??
        (defaultResult?.status === 'complete'
          ? defaultResult.residentCount
          : null))
  const calculationResult =
    defaultResult?.status === 'unsupported'
      ? defaultResult
      : calculateCurrentReferenceAnnualWater(count)
  return {
    calculationResult,
    missingReason:
      calculationResult.status === 'complete'
        ? null
        : (missingReason ??
          cause({
            source: 'currentReferenceWater',
            field: 'water',
            code: 'arithmetic',
            kind: 'invalid-supplied-input',
          })),
  }
}

export const createWaterMissingItem = (
  reason: BuildingInfoMissingReason
): EnergymapBuildingInfoMissingItem => ({
  id: 'energyConsumption.water',
  panelId: 'energyConsumption',
  label: tr('panels.energy.primary.water'),
  evidence: reason,
  reason: projectBuildingInfoMissingReason(reason),
})

const CERTIFICATE_METRICS = {
  electricity: 'certificateElectricity',
  district_heat: 'certificateDistrictHeat',
  district_cooling: 'certificateDistrictCooling',
  fossil_fuel: 'certificateFossilFuel',
  renewable_fuel: 'certificateRenewableFuel',
} as const

/** Effective quantities, not card/section presence, own applicability. F099 can suppress filled or intentionally unused quantities here. */
export const collectMissingBuildingInfo = ({
  candidates,
  properties,
  prefix,
  certificateOutcome,
  effectiveAvailability = {},
}: {
  candidates: EnergymapBuildingInfoPanel[]
  properties: EnergymapSelectedBuildingProperties
  prefix: EnergymapEnergyScenarioPrefix | null
  certificateOutcome: EnergyCertificateConsumptionOutcome
  effectiveAvailability?: Readonly<
    Partial<Record<string, 'available' | 'excluded'>>
  >
}): {
  items: EnergymapBuildingInfoMissingItem[]
  inventory: BuildingInfoFieldResolution[]
} => {
  const items: EnergymapBuildingInfoMissingItem[] = []
  const inventory: BuildingInfoFieldResolution[] = Object.entries(
    BUILDING_INFO_EXCLUSIONS
  ).map(([id, basis]) => ({ id, status: 'excluded', basis }))
  const add = ({
    id,
    panelId,
    label,
    isAvailable,
    reason,
  }: {
    id: string
    panelId: EnergymapBuildingInfoPanelId
    label: EnergymapBuildingInfoText
    isAvailable: boolean
    reason: () => BuildingInfoMissingReason
  }) => {
    const status =
      effectiveAvailability[id] ?? (isAvailable ? 'available' : 'missing')
    inventory.push({
      id,
      status,
      ...(status === 'excluded' ? { basis: 'effective-quantity-unused' } : {}),
    })
    if (status !== 'missing') return
    const evidence = reason()
    items.push({
      id,
      panelId,
      label,
      evidence,
      reason: projectBuildingInfoMissingReason(evidence),
    })
  }
  const details = candidates.find((panel) => panel.id === 'buildingDetails')
  for (const row of details?.sections.flatMap(
    (section) => section.rows ?? []
  ) ?? []) {
    const field = row.id as DetailField
    if (!Object.hasOwn(BUILDING_INFO_DETAIL_FIELDS, field)) continue
    const composite =
      field === 'address'
        ? ([
            'address.street',
            'address.postalCode',
            'address.postalOffice',
          ] as const)
        : field === 'heating'
          ? (['heating.source', 'heating.method'] as const)
          : null
    add({
      id: `buildingDetails.${field}`,
      panelId: 'buildingDetails',
      label: field === 'address' ? tr('missing_data.address') : row.label,
      isAvailable: available(row),
      reason: () =>
        composite == null
          ? detailReason(field, properties)
          : {
              ...fieldReason(field, properties),
              dependencies: composite.map((part) =>
                fieldReason(part, properties)
              ),
            },
    })
    if (composite == null) continue
    for (const part of composite) {
      if (!available(row)) {
        inventory.push({
          id: `buildingDetails.${part}`,
          status: 'excluded',
          basis: 'included-in-whole-row-reason',
        })
        continue
      }
      const property = BUILDING_INFO_DETAIL_FIELDS[part].properties[0]
      add({
        id: `buildingDetails.${part}`,
        panelId: 'buildingDetails',
        label: tr(`missing_reason.labels.${part}`),
        isAvailable:
          (field === 'heating'
            ? getCodeProperty(properties, property)
            : getStringProperty(properties, property)) != null,
        reason: () => fieldReason(part, properties),
      })
    }
  }

  const energy = candidates.find((panel) => panel.id === 'energyConsumption')
  const metrics =
    energy?.sections
      .flatMap((section) => section.metrics ?? [])
      .filter((metric) =>
        ['total', 'heating', 'electricity'].includes(metric.id)
      ) ?? []
  const addEstimate = ({
    panelId,
    id,
    label,
    values,
    measure,
    quantity,
  }: {
    panelId: EnergymapBuildingInfoPanelId
    id: string
    label: EnergymapBuildingInfoText
    values: {
      id: string
      label: EnergymapBuildingInfoText
      status: EnergymapBuildingInfoValue['status']
    }[]
    measure: EnergymapEnergyMeasure
    quantity: 'total' | 'heat' | 'elec'
  }) => {
    for (const value of values)
      add({
        id: `${panelId}.${id}.${value.id}`,
        panelId,
        label: sequence([label, value.label], ' — '),
        isAvailable: value.status === 'real' || value.status === 'estimate',
        reason: () => {
          const output = referenceOutputReason({
            properties,
            prefix,
            measure,
            quantity,
          })
          const dependencies = output == null ? [] : [output]
          if (
            value.id === 'annualTotal' &&
            getPositiveNumberProperty(properties, 'floor_area') == null
          )
            dependencies.push(fieldReason('floorArea', properties))
          if (value.id === 'savingsPercent') {
            const baseline =
              prefix == null
                ? null
                : getNumberProperty(properties, `${prefix}_default_total`)
            const raw =
              prefix == null ? undefined : properties[`${prefix}_default_total`]
            if (baseline == null || baseline <= 0)
              dependencies.push(
                cause({
                  source: M,
                  field: 'baseline',
                  code:
                    baseline == null
                      ? present(raw)
                        ? 'baseline-invalid'
                        : 'baseline-missing'
                      : 'baseline-nonpositive',
                  kind:
                    baseline == null && !present(raw)
                      ? 'legacy-cause-unestablished'
                      : 'invalid-supplied-input',
                })
              )
          }
          if (value.id === 'perSquareMeter' && output != null) return output
          return cause({
            source: M,
            field: `${measure}.${quantity}.${value.id}`,
            code:
              value.id === 'annualTotal'
                ? 'annual'
                : value.id === 'savingsPercent'
                  ? 'savings'
                  : 'arithmetic',
            kind: 'incomplete-calculation',
            dependencies: dependencies.length
              ? dependencies
              : [
                  cause({
                    source: M,
                    field: id,
                    code: 'arithmetic',
                    kind: 'invalid-supplied-input',
                  }),
                ],
          })
        },
      })
  }
  for (const metric of metrics)
    addEstimate({
      ...metric,
      panelId: 'energyConsumption',
      measure: 'default',
      quantity:
        metric.id === 'heating'
          ? 'heat'
          : metric.id === 'electricity'
            ? 'elec'
            : 'total',
    })
  for (const metric of energy?.sections.flatMap(
    (section) => section.consumptionControls?.primaryMetrics ?? []
  ) ?? []) {
    if (metric.id === 'energy') continue
    add({
      id: `energyConsumption.${metric.id}`,
      panelId: 'energyConsumption',
      label: metric.label,
      isAvailable: available(metric.value),
      reason: () =>
        metric.id === 'water'
          ? (resolveWaterMissingReason({
              origin: 'default',
              floorArea: properties.floor_area,
            }) ??
            cause({
              source: 'currentReferenceWater',
              field: 'water',
              code: 'arithmetic',
              kind: 'invalid-supplied-input',
            }))
          : calculationReason({
              id: metric.id as 'cost' | 'co2',
              failure: metric.calculationFailure,
              properties,
              prefix,
            }),
    })
  }

  const certificateApplicable =
    metrics.length < 3 ||
    metrics.some((metric) => metric.values.some((value) => !available(value)))
  if (
    !certificateApplicable ||
    effectiveAvailability['energyConsumption.certificateConsumption'] ===
      'excluded'
  ) {
    inventory.push({
      id: 'energyConsumption.certificateConsumption',
      status: 'excluded',
      basis: !certificateApplicable
        ? 'complete-reference-energy'
        : 'effective-quantity-unused',
    })
  } else if (certificateOutcome.status !== 'available') {
    add({
      id: 'energyConsumption.certificateConsumption',
      panelId: 'energyConsumption',
      label: tr('panels.energy.certificate.title'),
      isAvailable: false,
      reason: () =>
        certificateOutcome.status === 'absent'
          ? cause({
              source: C,
              field: 'certificateConsumption',
              code: 'certificate-absent',
              kind: 'legacy-cause-unestablished',
              dependencies:
                typeof properties.permanent_building_identifier !== 'string' ||
                properties.permanent_building_identifier.length === 0
                  ? [
                      cause({
                        source: C,
                        field: 'certificateConsumption',
                        code: 'certificate-join',
                        kind: 'missing-join-identifier',
                      }),
                    ]
                  : [],
            })
          : {
              source: C,
              field: 'certificateConsumption',
              kind: 'unusable-published-payload',
              code: certificateOutcome.reason,
              evidence: 'parser',
            },
    })
  } else {
    inventory.push({
      id: 'energyConsumption.certificateConsumption',
      status: 'available',
    })
    const record = certificateOutcome.record
    const missingCarriers = ENERGY_CERTIFICATE_STANDARD_CARRIERS.filter(
      (carrier) =>
        !record.components.some((component) => component.carrier === carrier)
    )
    const carrierReason = (carrier: string) => ({
      ...cause({
        source: C,
        field: carrier,
        code: 'certificate-carrier',
        kind: 'legacy-cause-unestablished',
      }),
      context: { carrier },
    })
    const totalReason = () =>
      cause({
        source: C,
        field: 'certificateTotal',
        code: 'certificate-total',
        kind: 'incomplete-calculation',
        dependencies: missingCarriers.map(carrierReason),
      })
    const quantities = [
      ...ENERGY_CERTIFICATE_STANDARD_CARRIERS.map((carrier) => ({
        id: CERTIFICATE_METRICS[carrier],
        label: tr(`panels.energy.certificate.carriers.${carrier}`),
        annual: record.components.find(
          (component) => component.carrier === carrier
        )?.annualKwh,
        reason: () => carrierReason(carrier),
      })),
      ...record.components
        .filter((component) => component.carrier === 'other')
        .map((component) => ({
          id: `certificateOther${component.sourceSlot}`,
          label: component.sourceName?.trim()
            ? { type: 'plain' as const, text: component.sourceName }
            : {
                type: 'translation' as const,
                keyName: `sidebar.building_info.panels.energy.certificate.carriers.other_${component.sourceSlot + 1}`,
              },
          annual: component.annualKwh,
          reason: () => carrierReason(`other${component.sourceSlot}`),
        })),
      {
        id: 'certificateTotal',
        label: tr('panels.energy.certificate.metric.complete_total'),
        annual:
          record.completeness === 'complete' ? record.totalKwhYear : undefined,
        reason: totalReason,
      },
    ]
    for (const quantity of quantities) {
      const certificateArea = record.heatedNetAreaM2
      for (const basis of ['annualTotal', 'perSquareMeter'] as const) {
        const annualAvailable = quantity.annual != null
        const intensityAvailable =
          annualAvailable &&
          isUsableEnergyIntensity(quantity.annual!, certificateArea)
        add({
          id: `energyConsumption.${quantity.id}.${basis}`,
          panelId: 'energyConsumption',
          label: sequence(
            [
              quantity.label,
              tr(
                `panels.energy.certificate.metric.${basis === 'annualTotal' ? 'annual_consumption' : 'per_square_meter'}`
              ),
            ],
            ' — '
          ),
          isAvailable:
            basis === 'annualTotal' ? annualAvailable : intensityAvailable,
          reason: () => {
            if (basis === 'annualTotal') return quantity.reason()
            const dependencies = [
              ...(annualAvailable ? [] : [quantity.reason()]),
              ...(certificateArea == null
                ? [
                    cause({
                      source: C,
                      field: 'certificateArea',
                      code:
                        certificateOutcome.metadata.heatedNetAreaM2 ===
                        'invalid'
                          ? 'certificate-area-invalid'
                          : 'certificate-area-absent',
                      kind:
                        certificateOutcome.metadata.heatedNetAreaM2 ===
                        'invalid'
                          ? 'invalid-supplied-input'
                          : 'legacy-cause-unestablished',
                    }),
                  ]
                : []),
            ]
            return cause({
              source: C,
              field: quantity.id,
              code: 'certificate-intensity',
              kind: 'incomplete-calculation',
              dependencies: dependencies.length
                ? dependencies
                : [
                    cause({
                      source: C,
                      field: quantity.id,
                      code: 'arithmetic',
                      kind: 'invalid-supplied-input',
                    }),
                  ],
            })
          },
        })
      }
    }
    for (const slot of [0, 1, 2])
      if (
        !record.components.some(
          (component) =>
            component.carrier === 'other' && component.sourceSlot === slot
        )
      )
        inventory.push({
          id: `energyConsumption.certificateOther${slot}`,
          status: 'excluded',
          basis: 'optional-slot-usage-not-established',
        })
  }
  const renovation = candidates.find(
    (panel) => panel.id === 'renovationRecommendations'
  )
  for (const section of renovation?.sections ?? []) {
    for (const row of section.rows ?? [])
      if (row.id === 'energyCertificateRecommendations')
        add({
          id: `renovationRecommendations.${row.id}`,
          panelId: 'renovationRecommendations',
          label: row.label,
          isAvailable: available(row),
          reason: () =>
            fieldReason('energyCertificateRecommendations', properties),
        })
    for (const scenario of section.scenarios ?? [])
      addEstimate({
        ...scenario,
        panelId: 'renovationRecommendations',
        measure: scenario.id,
        quantity: 'total',
      })
  }
  return { items, inventory }
}
