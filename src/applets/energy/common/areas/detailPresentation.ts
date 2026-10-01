import type { AreaDetail, AreaMetrics } from 'applets/energy/common/types/areas'
import {
  HEATING_METHOD_CODES,
  HEATING_ENERGY_SOURCE_CODES,
} from 'applets/energy/common/buildingCodes'
import { ENERGYMAP_BUILDING_TYPE_CODES } from 'applets/energy/layers/buildingPolygonsLayerConf'

export const AREA_DISTRIBUTIONS = [
  'heating_method',
  'heating_energy_source',
  'ventilation',
  'main_purpose',
  'construction_period',
] as const
export const AREA_SUMS = [
  'floor_area',
  'gross_floor_area',
  'total_area',
  'energy_certificate_heated_net_area',
] as const
const classes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const
const periods = [
  'before_1940',
  '1940_1959',
  '1960_1979',
  '1980_1999',
  '2000_2019',
  '2020_onward',
] as const
const prefix = 'sidebar.area_map.'
type Distribution = (typeof AREA_DISTRIBUTIONS)[number]

export const officialScaleSummary = ({
  detail,
  scale,
}: {
  detail: AreaDetail
  scale: '2013' | '2018'
}) => {
  const official = detail.metrics.official_class
  if (!official) return undefined
  // Raw counts and modeled outputs are deliberately never consulted.
  const counts = official.valid_counts_by_scale[scale] ?? {}
  const denominator = classes.reduce(
    (total, key) => total + (counts[key] ?? 0),
    0
  )
  return {
    denominator,
    population: detail.building_count,
    rows: classes.map((key) => ({
      key,
      count: counts[key] ?? 0,
      fraction:
        detail.building_count > 0 && denominator > 0
          ? (counts[key] ?? 0) / denominator
          : null,
    })),
  }
}
const categoryKey = ({
  metric,
  category,
}: {
  metric: Distribution
  category: string
}) => {
  if (
    category === 'unknown' ||
    (metric === 'ventilation' && category === 'no_info')
  )
    return `${prefix}unknown_information`
  const knownCodes: readonly string[] =
    metric === 'heating_method'
      ? HEATING_METHOD_CODES
      : metric === 'heating_energy_source'
        ? HEATING_ENERGY_SOURCE_CODES
        : metric === 'main_purpose'
          ? ENERGYMAP_BUILDING_TYPE_CODES
          : []
  if (knownCodes.includes(category))
    return `sidebar.building_info.codes.${metric}.${category}`
  if (
    metric === 'ventilation' &&
    ['gravity', 'mechanical', 'other'].includes(category)
  )
    return `sidebar.front_page.ventilation.legend.${category}`
  if (
    metric === 'construction_period' &&
    (periods as readonly string[]).includes(category)
  )
    return `${prefix}period.${category}`
  return undefined
}
export const distributionRows = ({
  metric,
  summary,
}: {
  metric: Distribution
  summary: NonNullable<AreaMetrics[Distribution]>
}) => {
  let unrecognized = 0
  return Object.entries(summary.counts).map(([category, count]) => {
    const keyName = categoryKey({ metric, category })
    return {
      count,
      keyName: keyName ?? `${prefix}unrecognized_category`,
      ...(keyName ? {} : { index: ++unrecognized }),
    }
  })
}
