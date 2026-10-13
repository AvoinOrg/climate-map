import type { AreaLevel } from 'applets/energy/common/types/areas'

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
