import type { VectorSourceSpecification } from 'maplibre-gl'
import type { AreaLevel } from 'applets/energy/common/types/areas'
import { AREA_LEVELS } from 'applets/energy/common/areas/contract'
import { ENERGYMAP_GEOSERVER_URL } from 'applets/energy/layers/geoServer'

export type AreaSourceDescriptor = {
  level: AreaLevel
  sourceId: string
  sourceLayer: string
  source: VectorSourceSpecification
}
// Published EX_GeographicBoundingBox values from sandbox_energiakartta WMS
// GetCapabilities (2026-10-13). Keep coverage independent of the details API.
// GeoWebCache returns 404 outside these extents, including the Baltic Sea.
const AREA_SOURCE_BOUNDS: Record<AreaLevel, [number, number, number, number]> = {
  postal_code: [
    19.472262255092012, 59.72203320748324, 31.586703941366043, 70.0922932130507,
  ],
  municipality: [
    19.08320007149181, 59.45415035126564, 31.58670343629741, 70.09209972105862,
  ],
  region: [
    19.304133798774988, 59.75809870539337, 31.58670343691126, 70.09266042096007,
  ],
}
// Coverage is published independently of the optional statistics service.
export const createAreaSourceDescriptors = ({
  geoServerUrl = ENERGYMAP_GEOSERVER_URL,
}: { geoServerUrl?: string } = {}): AreaSourceDescriptor[] =>
  AREA_LEVELS.map((level) => {
    const sourceLayer = `energymap_${level}_areas`
    const qualifiedLayer = encodeURIComponent(
      `sandbox_energiakartta:${sourceLayer}`
    )
    return {
      level,
      sourceId: `energymap_areas_${level}`,
      sourceLayer,
      source: {
        type: 'vector',
        tiles: [
          `${geoServerUrl.replace(/\/$/, '')}/gwc/service/tms/1.0.0/${qualifiedLayer}@EPSG%3A900913@pbf/{z}/{x}/{y}.pbf`,
        ],
        scheme: 'tms',
        minzoom: 0,
        maxzoom: 14,
        bounds: [...AREA_SOURCE_BOUNDS[level]],
        promoteId: 'area_id',
      },
    }
  })
export const areaSourceDescriptorSignature = (
  descriptors: readonly AreaSourceDescriptor[]
) => JSON.stringify(descriptors)
