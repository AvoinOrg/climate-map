import type { MapGeoJSONFeature } from 'maplibre-gl'
import type {
  AreaDetailRequest,
  AreaMetadata,
} from 'applets/energy/common/types/areas'
import type { AreaSourceDescriptor } from 'applets/energy/layers/areaSource'
import type { EffectiveGeography } from 'applets/energy/common/areas/mapModes'
import { parseAreaTileProperties } from 'applets/energy/common/areas/contract'

// Shared selectedFeatures owns the identity. Tile IDs and clipped geometry are
// never used to reconstruct codes or bounds. Whole-area clicks omit postal scope.
export const projectAreaSelection = ({
  features,
  descriptors,
  effective,
}: {
  features: readonly MapGeoJSONFeature[]
  descriptors: readonly AreaSourceDescriptor[]
  effective: EffectiveGeography
}): AreaDetailRequest | undefined => {
  const descriptor = descriptors.find((item) => item.level === effective)
  if (!descriptor) return undefined
  const requests = new Map<string, AreaDetailRequest>()
  for (const feature of features) {
    if (
      feature.source !== descriptor.sourceId ||
      feature.sourceLayer !== descriptor.sourceLayer
    )
      continue
    try {
      const properties = parseAreaTileProperties(feature.properties, {
        releaseId: descriptor.releaseId,
        level: descriptor.level,
      })
      if (feature.id !== properties.area_id) continue
      requests.set(properties.area_id, {
        releaseId: descriptor.releaseId,
        level: descriptor.level,
        areaCode: properties.area_code,
      })
    } catch {
      /* Untrusted or obsolete tile selection cannot enter the API boundary. */
    }
  }
  return requests.size === 1 ? [...requests.values()][0] : undefined
}
export const detailMatchesMetadata = ({
  detail,
  metadata,
}: {
  detail: { release_id: string; boundary_vintage: number; as_of: string }
  metadata: AreaMetadata
}) =>
  detail.release_id === metadata.release_id &&
  detail.boundary_vintage === metadata.boundary_vintage &&
  detail.as_of === metadata.as_of
