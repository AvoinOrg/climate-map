import type { VectorSourceSpecification } from 'maplibre-gl'
import type {
  AreaApiConfigResult,
  AreaLevel,
  AreaMetadata,
} from 'applets/energy/common/types/areas'
import {
  AREA_LEVELS,
  parseAreaMetadata,
} from 'applets/energy/common/areas/contract'
import { resolveAreaTileUrl } from 'applets/energy/common/areas/config'

export type AreaSourceDescriptor = {
  releaseId: string
  level: AreaLevel
  sourceId: string
  sourceLayer: string
  source: VectorSourceSpecification
}
export const createAreaSourceDescriptors = ({
  config,
  metadata,
}: {
  config: AreaApiConfigResult
  metadata: AreaMetadata
}): AreaSourceDescriptor[] => {
  const validated = parseAreaMetadata(metadata)
  return AREA_LEVELS.map((level) => {
    const layer = validated.layers[level]
    return {
      releaseId: validated.release_id,
      level,
      sourceId: `energymap_areas_${validated.release_id}_${level}`,
      sourceLayer: layer.source_layer,
      source: {
        type: 'vector',
        tiles: [resolveAreaTileUrl({ config, template: layer.url })],
        scheme: layer.scheme ?? 'xyz',
        minzoom: layer.minzoom,
        maxzoom: layer.maxzoom,
        promoteId: 'area_id',
      },
    }
  })
}
// Compare this on metadata refresh, even when release_id did not change.
// F101.2 owns replacing sources/selection atomically when the signature changes.
export const areaSourceDescriptorSignature = (
  descriptors: readonly AreaSourceDescriptor[]
) =>
  JSON.stringify(
    descriptors.map(({ releaseId, level, sourceId, sourceLayer, source }) => [
      releaseId,
      level,
      sourceId,
      sourceLayer,
      source.tiles,
      source.scheme,
      source.minzoom,
      source.maxzoom,
      source.promoteId,
    ])
  )
