import type { ExpressionSpecification } from 'maplibre-gl'
import type { AreaLevel } from 'applets/energy/common/types/areas'

export type AreaMetric = 'certificate_coverage' | 'building_count'
export type EffectiveGeography = AreaLevel | 'buildings'
export const AUTOMATIC_AREA_RANGES = {
  region: { minzoom: 0, maxzoom: 7 },
  municipality: { minzoom: 7, maxzoom: 10 },
  postal_code: { minzoom: 10, maxzoom: 12 },
} as const
export const resolveAreaGeography = ({
  zoom,
}: {
  zoom: number
}): EffectiveGeography => {
  if (zoom < AUTOMATIC_AREA_RANGES.region.maxzoom) return 'region'
  if (zoom < AUTOMATIC_AREA_RANGES.municipality.maxzoom) return 'municipality'
  if (zoom < AUTOMATIC_AREA_RANGES.postal_code.maxzoom) return 'postal_code'
  return 'buildings'
}
export const AREA_UNAVAILABLE_COLOR = '#BDBDBD'
export const AREA_METRIC_BANDS = {
  building_count: [
    { min: 0, max: 1, color: '#EFF3FF' },
    { min: 1, max: 100, color: '#C6DBEF' },
    { min: 100, max: 1000, color: '#9ECAE1' },
    { min: 1000, max: 10000, color: '#6BAED6' },
    { min: 10000, max: 100000, color: '#3182BD' },
    { min: 100000, max: null, color: '#08519C' },
  ],
  certificate_coverage: [
    { min: 0, max: 0.1, color: '#EFF3FF' },
    { min: 0.1, max: 0.25, color: '#BDD7E7' },
    { min: 0.25, max: 0.5, color: '#6BAED6' },
    { min: 0.5, max: 0.75, color: '#3182BD' },
    { min: 0.75, max: 1, color: '#08519C' },
  ],
} as const
export const areaMetricColorExpression = (
  metric: AreaMetric
): ExpressionSpecification => {
  const bands = AREA_METRIC_BANDS[metric]
  return [
    'case',
    ['all', ['has', metric], ['==', ['typeof', ['get', metric]], 'number']],
    [
      'step',
      ['number', ['get', metric], 0],
      bands[0].color,
      ...bands.slice(1).flatMap((band) => [band.min, band.color]),
    ],
    AREA_UNAVAILABLE_COLOR,
  ] as ExpressionSpecification
}
