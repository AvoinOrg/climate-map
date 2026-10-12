import type { MapGeoJSONFeature } from 'maplibre-gl'
import type { AreaDetailRequest } from 'applets/energy/common/types/areas'
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
  const current = parseAreaDetailRequest(request)
  if (current.level !== descriptor.level)
    throw new Error('Incompatible area navigation level')
  const feature = {
    source: descriptor.sourceId,
    sourceLayer: descriptor.sourceLayer,
    id: `${current.level}:${current.areaCode}`,
    isPlaceholder: true,
    // Also makes scope-only changes observable to the store's equality check.
    areaDetailRequest: current,
  } as unknown as ExtendedMapGeoJSONFeature
  navigationRequests.set(feature, current)
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
        const current = parseAreaDetailRequest(internal)
        if (
          current.level === descriptor.level &&
          feature.id === `${current.level}:${current.areaCode}`
        )
          requests.set(String(feature.id), current)
        continue
      }
      const properties = parseAreaTileProperties(feature.properties, {
        level: descriptor.level,
      })
      if (feature.id !== properties.area_id) continue
      requests.set(properties.area_id, {
        level: descriptor.level,
        areaCode: properties.area_code,
      })
    } catch {
      /* Untrusted or obsolete tile selection cannot enter the API boundary. */
    }
  }
  return requests.size === 1 ? [...requests.values()][0] : undefined
}
