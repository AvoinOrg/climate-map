import type { MapGeoJSONFeature } from 'maplibre-gl'
import type {
  AreaDetailRequest,
  AreaMetadata,
} from 'applets/energy/common/types/areas'
import type { AreaSourceDescriptor } from 'applets/energy/layers/areaSource'
import type { EffectiveGeography } from 'applets/energy/common/areas/mapModes'
import {
  parseAreaDetailRequest,
  parseAreaTileProperties,
} from 'applets/energy/common/areas/contract'
import type { ExtendedMapGeoJSONFeature } from '#/common/types/map'

const navigationRequests = new WeakMap<MapGeoJSONFeature, AreaDetailRequest>()

// The shared store already supports identity-only vector placeholders. No
// fabricated tile statistics, names, geometry or bounds accompany navigation.
export const createAreaSelection = ({
  request,
  descriptor,
}: {
  request: AreaDetailRequest
  descriptor: AreaSourceDescriptor
}): MapGeoJSONFeature => {
  const pinned = parseAreaDetailRequest(request)
  if (
    pinned.releaseId !== descriptor.releaseId ||
    pinned.level !== descriptor.level
  )
    throw new Error('Incompatible area navigation generation')
  const feature = {
    source: descriptor.sourceId,
    sourceLayer: descriptor.sourceLayer,
    id: `${pinned.level}:${pinned.areaCode}`,
    isPlaceholder: true,
    // Also makes scope-only changes observable to the store's equality check.
    areaDetailRequest: pinned,
  } as unknown as ExtendedMapGeoJSONFeature
  navigationRequests.set(feature, pinned)
  return feature
}

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
      const internal = navigationRequests.get(feature)
      if (internal) {
        const pinned = parseAreaDetailRequest(internal)
        if (
          pinned.releaseId === descriptor.releaseId &&
          pinned.level === descriptor.level &&
          feature.id === `${pinned.level}:${pinned.areaCode}`
        )
          requests.set(String(feature.id), pinned)
        continue
      }
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
