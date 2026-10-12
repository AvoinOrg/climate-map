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
        promoteId: 'area_id',
      },
    }
  })
export const areaSourceDescriptorSignature = (
  descriptors: readonly AreaSourceDescriptor[]
) => JSON.stringify(descriptors)
