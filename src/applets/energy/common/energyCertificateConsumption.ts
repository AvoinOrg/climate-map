import type { EnergymapSelectedBuildingProperties } from './types'

export type EnergyCertificateConsumptionStandardCarrier =
  | 'electricity'
  | 'district_heat'
  | 'district_cooling'
  | 'fossil_fuel'
  | 'renewable_fuel'

export type EnergyCertificateConsumptionStandardComponent = {
  readonly carrier: EnergyCertificateConsumptionStandardCarrier
  readonly annualKwh: number
}

export type EnergyCertificateConsumptionOtherComponent = {
  readonly carrier: 'other'
  readonly sourceSlot: 0 | 1 | 2
  readonly sourceName: string | null
  readonly annualKwh: number
}

export type EnergyCertificateConsumptionComponent =
  | EnergyCertificateConsumptionStandardComponent
  | EnergyCertificateConsumptionOtherComponent

export type EnergyCertificateConsumptionRecordBase = {
  readonly schemaVersion: 1
  readonly basis: 'standardized_calculation'
  readonly unit: 'kWh/year'
  readonly certificateVersion: 2013 | 2018
  readonly certificateId: string
  readonly buildingIdentifier: string
  readonly components: readonly EnergyCertificateConsumptionComponent[]
  readonly signedAt?: string
  readonly validUntil?: string
  readonly heatedNetAreaM2?: number
}

export type EnergyCertificateConsumptionCompleteRecord =
  EnergyCertificateConsumptionRecordBase & {
    readonly completeness: 'complete'
    readonly totalKwhYear: number
  }

export type EnergyCertificateConsumptionPartialRecord =
  EnergyCertificateConsumptionRecordBase & {
    readonly completeness: 'partial'
    readonly totalKwhYear: null
  }

export type EnergyCertificateConsumptionRecord =
  | EnergyCertificateConsumptionCompleteRecord
  | EnergyCertificateConsumptionPartialRecord

export const ENERGY_CERTIFICATE_CONSUMPTION_PROPERTY =
  'energy_certificate_consumption'
const BUILDING_IDENTIFIER_PROPERTY = 'permanent_building_identifier'

export const ENERGY_CERTIFICATE_STANDARD_CARRIERS = [
  'electricity',
  'district_heat',
  'district_cooling',
  'fossil_fuel',
  'renewable_fuel',
] as const satisfies readonly EnergyCertificateConsumptionStandardCarrier[]

const STANDARD_CARRIER_SET: ReadonlySet<string> = new Set(
  ENERGY_CERTIFICATE_STANDARD_CARRIERS
)
const OTHER_SOURCE_SLOTS: ReadonlySet<number> = new Set([0, 1, 2])

const ISO_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:(?:Z)|(?:[+-](\d{2}):(\d{2})))?$/

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isAnnualKwh = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

const isStandardCarrier = (
  value: unknown
): value is EnergyCertificateConsumptionStandardCarrier =>
  typeof value === 'string' && STANDARD_CARRIER_SET.has(value)

const isOtherSourceSlot = (value: unknown): value is 0 | 1 | 2 =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  OTHER_SOURCE_SLOTS.has(value)

const isSupportedCertificateVersion = (value: unknown): value is 2013 | 2018 =>
  value === 2013 || value === 2018

const isLeapYear = (year: number) =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)

const daysInMonth = (year: number, month: number) => {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  if ([4, 6, 9, 11].includes(month)) return 30
  return 31
}

const normalizeTimestamp = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined

  const match = ISO_TIMESTAMP_PATTERN.exec(value)
  if (!match) return undefined

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const offsetHour = match[7] === undefined ? undefined : Number(match[7])
  const offsetMinute = match[8] === undefined ? undefined : Number(match[8])

  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month) ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return undefined
  }

  if (
    offsetHour !== undefined &&
    offsetMinute !== undefined &&
    (offsetHour > 14 ||
      offsetMinute > 59 ||
      (offsetHour === 14 && offsetMinute !== 0))
  ) {
    return undefined
  }

  return value
}

const normalizeHeatedNetArea = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : undefined

const totalsAreConsistent = ({
  componentSum,
  total,
  componentCount,
}: {
  componentSum: number
  total: number
  componentCount: number
}) => {
  // Keep this near machine precision: accept representation noise, not a
  // meaningful difference in annual kWh.
  const tolerance = Math.max(
    1e-9,
    Number.EPSILON *
      16 *
      Math.max(1, Math.abs(componentSum), Math.abs(total)) *
      componentCount
  )

  return Math.abs(componentSum - total) <= tolerance
}

export const ENERGY_CERTIFICATE_CONSUMPTION_FAILURES = [
  'wrong-type',
  'malformed-json',
  'invalid-object',
  'unsupported-schema',
  'unsupported-version',
  'unsupported-basis',
  'unsupported-unit',
  'selected-identity',
  'payload-identity',
  'certificate-identity',
  'identity-mismatch',
  'invalid-completeness',
  'invalid-components',
  'invalid-component',
  'invalid-quantity',
  'unsupported-carrier',
  'invalid-slot',
  'invalid-name',
  'duplicate-carrier',
  'duplicate-slot',
  'incomplete-declared-total',
  'partial-declared-total',
  'invalid-total',
  'inconsistent-total',
  'unreadable-record',
] as const
export type EnergyCertificateConsumptionFailure =
  (typeof ENERGY_CERTIFICATE_CONSUMPTION_FAILURES)[number]

export type EnergyCertificateMetadataOutcome =
  | 'available'
  | 'absent'
  | 'invalid'
export type EnergyCertificateConsumptionOutcome =
  | { status: 'absent' }
  | { status: 'unusable'; reason: EnergyCertificateConsumptionFailure }
  | {
      status: 'available'
      record: EnergyCertificateConsumptionRecord
      metadata: {
        signedAt: EnergyCertificateMetadataOutcome
        validUntil: EnergyCertificateMetadataOutcome
        heatedNetAreaM2: EnergyCertificateMetadataOutcome
      }
    }

const unusable = (
  reason: EnergyCertificateConsumptionFailure
): EnergyCertificateConsumptionOutcome => ({ status: 'unusable', reason })
const metadataOutcome = (
  raw: unknown,
  normalized: unknown
): EnergyCertificateMetadataOutcome =>
  normalized !== undefined ? 'available' : raw == null ? 'absent' : 'invalid'

const parseRecord = (
  properties: EnergymapSelectedBuildingProperties
): EnergyCertificateConsumptionOutcome => {
  const rawConsumption = properties[ENERGY_CERTIFICATE_CONSUMPTION_PROPERTY]
  if (rawConsumption === undefined || rawConsumption === null)
    return { status: 'absent' }
  if (typeof rawConsumption !== 'string') return unusable('wrong-type')

  const selectedBuildingIdentifier = properties[BUILDING_IDENTIFIER_PROPERTY]
  if (
    typeof selectedBuildingIdentifier !== 'string' ||
    selectedBuildingIdentifier.length === 0
  ) {
    return unusable('selected-identity')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawConsumption)
  } catch {
    return unusable('malformed-json')
  }
  if (!isObject(parsed)) return unusable('invalid-object')
  if (parsed.schema_version !== 1) return unusable('unsupported-schema')
  if (parsed.basis !== 'standardized_calculation')
    return unusable('unsupported-basis')
  if (parsed.unit !== 'kWh/year') return unusable('unsupported-unit')
  if (!isSupportedCertificateVersion(parsed.certificate_version))
    return unusable('unsupported-version')
  if (
    typeof parsed.certificate_id !== 'string' ||
    parsed.certificate_id.length === 0
  )
    return unusable('certificate-identity')
  if (
    typeof parsed.building_identifier !== 'string' ||
    parsed.building_identifier.length === 0
  )
    return unusable('payload-identity')
  if (parsed.building_identifier !== selectedBuildingIdentifier)
    return unusable('identity-mismatch')
  if (parsed.completeness !== 'complete' && parsed.completeness !== 'partial')
    return unusable('invalid-completeness')
  if (!Array.isArray(parsed.components) || parsed.components.length === 0)
    return unusable('invalid-components')

  const components: EnergyCertificateConsumptionComponent[] = []
  const seenStandardCarriers =
    new Set<EnergyCertificateConsumptionStandardCarrier>()
  const seenOtherSlots = new Set<0 | 1 | 2>()
  for (const rawComponent of parsed.components) {
    if (!isObject(rawComponent)) return unusable('invalid-component')
    if (!isAnnualKwh(rawComponent.annual_kwh))
      return unusable('invalid-quantity')
    if (isStandardCarrier(rawComponent.carrier)) {
      if (seenStandardCarriers.has(rawComponent.carrier))
        return unusable('duplicate-carrier')
      seenStandardCarriers.add(rawComponent.carrier)
      components.push({
        carrier: rawComponent.carrier,
        annualKwh: rawComponent.annual_kwh,
      })
      continue
    }
    if (rawComponent.carrier !== 'other') return unusable('unsupported-carrier')
    if (!isOtherSourceSlot(rawComponent.source_slot))
      return unusable('invalid-slot')
    if (typeof rawComponent.name !== 'string' && rawComponent.name !== null)
      return unusable('invalid-name')
    if (seenOtherSlots.has(rawComponent.source_slot))
      return unusable('duplicate-slot')
    seenOtherSlots.add(rawComponent.source_slot)
    components.push({
      carrier: 'other',
      sourceSlot: rawComponent.source_slot,
      sourceName: rawComponent.name,
      annualKwh: rawComponent.annual_kwh,
    })
  }

  const signedAt = normalizeTimestamp(parsed.signed_at)
  const validUntil = normalizeTimestamp(parsed.valid_until)
  const heatedNetAreaM2 = normalizeHeatedNetArea(parsed.heated_net_area_m2)
  const metadata = {
    signedAt: metadataOutcome(parsed.signed_at, signedAt),
    validUntil: metadataOutcome(parsed.valid_until, validUntil),
    heatedNetAreaM2: metadataOutcome(
      parsed.heated_net_area_m2,
      heatedNetAreaM2
    ),
  }
  const baseRecord = {
    schemaVersion: 1,
    basis: 'standardized_calculation',
    unit: 'kWh/year',
    certificateVersion: parsed.certificate_version,
    certificateId: parsed.certificate_id,
    buildingIdentifier: parsed.building_identifier,
    components,
    ...(signedAt === undefined ? {} : { signedAt }),
    ...(validUntil === undefined ? {} : { validUntil }),
    ...(heatedNetAreaM2 === undefined ? {} : { heatedNetAreaM2 }),
  } as const

  if (parsed.completeness === 'partial') {
    if (
      Object.hasOwn(parsed, 'total_kwh_year') &&
      parsed.total_kwh_year !== null
    )
      return unusable('partial-declared-total')
    return {
      status: 'available',
      metadata,
      record: { ...baseRecord, completeness: 'partial', totalKwhYear: null },
    }
  }
  if (seenStandardCarriers.size !== ENERGY_CERTIFICATE_STANDARD_CARRIERS.length)
    return unusable('incomplete-declared-total')
  if (!isAnnualKwh(parsed.total_kwh_year)) return unusable('invalid-total')
  const componentSum = components.reduce(
    (sum, component) => sum + component.annualKwh,
    0
  )
  if (
    !Number.isFinite(componentSum) ||
    !totalsAreConsistent({
      componentSum,
      total: parsed.total_kwh_year,
      componentCount: components.length,
    })
  )
    return unusable('inconsistent-total')
  return {
    status: 'available',
    metadata,
    record: {
      ...baseRecord,
      completeness: 'complete',
      totalKwhYear: parsed.total_kwh_year,
    },
  }
}

/** The sole parser. Optional metadata failures never reject otherwise usable energy. */
export const parseEnergyCertificateConsumptionOutcome = (
  properties: EnergymapSelectedBuildingProperties
): EnergyCertificateConsumptionOutcome => {
  try {
    return parseRecord(properties)
  } catch {
    return unusable('unreadable-record')
  }
}

export const parseEnergyCertificateConsumption = (
  properties: EnergymapSelectedBuildingProperties
): EnergyCertificateConsumptionRecord | null => {
  const outcome = parseEnergyCertificateConsumptionOutcome(properties)
  return outcome.status === 'available' ? outcome.record : null
}
