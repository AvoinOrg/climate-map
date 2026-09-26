import type { EnergymapSelectedBuilding } from './types'
import type {
  EnergymapEnergyMeasure,
  EnergymapEnergyScenarioPrefix,
} from './buildingInfo'

/** Documented table exclusions, independent of whether a stored column is populated. */
export const getEnergyReferenceCoverageExclusions = ({
  purpose,
  prefix,
  measure,
}: {
  purpose: string | null
  prefix: EnergymapEnergyScenarioPrefix | null
  measure: EnergymapEnergyMeasure
}) => {
  const exclusions: (
    | 'unsupported-building'
    | 'unsupported-heating'
    | 'unsupported-aahp'
  )[] = []
  if (purpose != null && purpose !== '05' && purpose !== '06') {
    exclusions.push('unsupported-building')
  }
  if (purpose === '06' && (prefix === 'wood' || prefix === 'elecb')) {
    exclusions.push('unsupported-heating')
  }
  if (
    measure === 'aahp' &&
    (purpose === '06' || prefix === 'awhp' || prefix === 'gshp')
  ) {
    exclusions.push('unsupported-aahp')
  }
  return exclusions
}

export const getStringProperty = (
  properties: EnergymapSelectedBuilding['properties'],
  propertyName: string
): string | null => {
  const value = properties[propertyName]

  if (typeof value === 'string') {
    const trimmedValue = value.trim()
    return trimmedValue === '' ? null : trimmedValue
  }

  return null
}

export const getCodeProperty = (
  properties: EnergymapSelectedBuilding['properties'],
  propertyName: string
): string | null => {
  const value = properties[propertyName]

  if (typeof value === 'number' && Number.isInteger(value)) {
    return String(value).padStart(2, '0')
  }

  return getStringProperty(properties, propertyName)
}

export const getNumberProperty = (
  properties: EnergymapSelectedBuilding['properties'],
  propertyName: string
): number | null => {
  const value = properties[propertyName]

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().replace(',', '.')
    if (normalizedValue === '') {
      return null
    }

    const parsedValue = Number(normalizedValue)
    return Number.isFinite(parsedValue) ? parsedValue : null
  }

  return null
}

export const getPositiveNumberProperty = (
  properties: EnergymapSelectedBuilding['properties'],
  propertyName: string
) => {
  const value = getNumberProperty(properties, propertyName)
  return value != null && value > 0 ? value : null
}

export const formatCalendarDate = ({
  value,
  locale,
}: {
  value: unknown
  locale: string
}): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const match = value
    .trim()
    .match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):?(\d{2}))?)?$/
    )

  if (match == null) {
    return null
  }

  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    offsetHourText,
    offsetMinuteText,
  ] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  const offsetHour = Number(offsetHourText)
  const offsetMinute = Number(offsetMinuteText)

  if (
    (hourText != null && (hour > 23 || minute > 59 || second > 59)) ||
    (offsetHourText != null &&
      (offsetHour > 14 ||
        offsetMinute > 59 ||
        (offsetHour === 14 && offsetMinute !== 0)))
  ) {
    return null
  }

  const date = new Date(0)

  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)

  if (
    year < 1 ||
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export const formatYearFromDate = (value: unknown): string | null => {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const text = String(value).trim()
  if (/^[0-9]{4}$/.test(text) && Number(text) > 0) return text
  return formatCalendarDate({ value, locale: 'en' }) == null
    ? null
    : text.slice(0, 4)
}

export const getOpaqueIdentifier = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null

export const getEnergyNumberProperty = (
  properties: EnergymapSelectedBuilding['properties'],
  propertyName: string
): number | null => {
  const value = getNumberProperty(properties, propertyName)
  return value != null && value >= 0 ? value : null
}

export const isUsableProduct = (left: number, right: number) =>
  Number.isFinite(left * right) &&
  (left === 0 || right === 0 || left * right !== 0)

export const isUsableEnergyIntensity = (
  annual: number,
  area: number | undefined
) =>
  area != null &&
  area > 0 &&
  Number.isFinite(annual / area) &&
  (annual === 0 || annual / area > 0)
