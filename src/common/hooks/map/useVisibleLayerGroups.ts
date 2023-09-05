import { useMapStore } from '#/common/store/mapStore'
import { getVisibleLayerGroups } from '#/common/utils/map'

export const useVisibleLayerGroups = () => {
  const layerGroups = useMapStore((state) => state._layerGroups)

  return getVisibleLayerGroups(layerGroups)
}
