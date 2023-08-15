import { useMapStore } from '#/common/store/mapStore'
import { LayerGroupOptions } from '#/common/types/map'

export const useVisibleLayerGroups = () => {
  const layerGroups = useMapStore((state) => state._layerGroups)

  return Object.keys(layerGroups)
    .filter((key) => !layerGroups[key].isHidden)
    .reduce((acc: Record<string, LayerGroupOptions>, key) => {
      acc[key] = layerGroups[key]
      return acc
    }, {})
}
