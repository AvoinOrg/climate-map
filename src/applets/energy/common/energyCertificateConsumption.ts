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

const STANDARD_CARRIERS = [
  'electricity',
  'district_heat',
  'district_cooling',
  'fossil_fuel',
  'renewable_fuel',
] as const satisfies readonly EnergyCertificateConsumptionStandardCarrier[]

const STANDARD_CARRIER_SET: ReadonlySet<string> = new Set(STANDARD_CARRIERS)
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

const isSupportedCertificateVersion = (
  value: unknown
): value is 2013 | 2018 => value === 2013 || value === 2018

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

const parseRecord = (
  properties: EnergymapSelectedBuildingProperties
): EnergyCertificateConsumptionRecord | null => {
  const rawConsumption = properties[ENERGY_CERTIFICATE_CONSUMPTION_PROPERTY]
  if (rawConsumption === undefined || rawConsumption === null) return null
  if (typeof rawConsumption !== 'string') return null

  const selectedBuildingIdentifier = properties[BUILDING_IDENTIFIER_PROPERTY]
  if (
    typeof selectedBuildingIdentifier !== 'string' ||
    selectedBuildingIdentifier.length === 0
  ) {
    return null
  }

  const parsed: unknown = JSON.parse(rawConsumption)
  if (!isObject(parsed)) return null

  if (
    parsed.schema_version !== 1 ||
    parsed.basis !== 'standardized_calculation' ||
    parsed.unit !== 'kWh/year' ||
    !isSupportedCertificateVersion(parsed.certificate_version) ||
    typeof parsed.certificate_id !== 'string' ||
    parsed.certificate_id.length === 0 ||
    typeof parsed.building_identifier !== 'string' ||
    parsed.building_identifier.length === 0 ||
    parsed.building_identifier !== selectedBuildingIdentifier ||
    (parsed.completeness !== 'complete' && parsed.completeness !== 'partial') ||
    !Array.isArray(parsed.components) ||
    parsed.components.length === 0
  ) {
    return null
  }

  const components: EnergyCertificateConsumptionComponent[] = []
  const seenStandardCarriers = new Set<EnergyCertificateConsumptionStandardCarrier>()
  const seenOtherSlots = new Set<0 | 1 | 2>()

  for (const rawComponent of parsed.components) {
    if (!isObject(rawComponent) || !isAnnualKwh(rawComponent.annual_kwh)) {
      return null
    }

    if (isStandardCarrier(rawComponent.carrier)) {
      if (seenStandardCarriers.has(rawComponent.carrier)) return null
      seenStandardCarriers.add(rawComponent.carrier)
      components.push({
        carrier: rawComponent.carrier,
        annualKwh: rawComponent.annual_kwh,
      })
      continue
    }

    if (rawComponent.carrier !== 'other') return null
    if (
      !isOtherSourceSlot(rawComponent.source_slot) ||
      (typeof rawComponent.name !== 'string' && rawComponent.name !== null) ||
      seenOtherSlots.has(rawComponent.source_slot)
    ) {
      return null
    }

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
  const context = {
    ...(signedAt === undefined ? {} : { signedAt }),
    ...(validUntil === undefined ? {} : { validUntil }),
    ...(heatedNetAreaM2 === undefined ? {} : { heatedNetAreaM2 }),
  }
  const baseRecord = {
    schemaVersion: 1,
    basis: 'standardized_calculation',
    unit: 'kWh/year',
    certificateVersion: parsed.certificate_version,
    certificateId: parsed.certificate_id,
    buildingIdentifier: parsed.building_identifier,
    components,
    ...context,
  } as const

  if (parsed.completeness === 'partial') {
    if (
      Object.hasOwn(parsed, 'total_kwh_year') &&
      parsed.total_kwh_year !== null
    ) {
      return null
    }

    return {
      ...baseRecord,
      completeness: 'partial',
      totalKwhYear: null,
    }
  }

  if (
    seenStandardCarriers.size !== STANDARD_CARRIERS.length ||
    !isAnnualKwh(parsed.total_kwh_year)
  ) {
    return null
  }

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
  ) {
    return null
  }

  return {
    ...baseRecord,
    completeness: 'complete',
    totalKwhYear: parsed.total_kwh_year,
  }
}

export const parseEnergyCertificateConsumption = (
  properties: EnergymapSelectedBuildingProperties
): EnergyCertificateConsumptionRecord | null => {
  try {
    return parseRecord(properties)
  } catch {
    return null
  }
}
