import { useMapStore } from '#/common/store/mapStore'

export const useVisibleLayerGroupIds = () => {
  const layerGroups = useMapStore((state) => state._layerGroups)

  return Object.values(layerGroups)
    .filter((layerGroup) => !layerGroup.isHidden)
    .map((layerGroup) => layerGroup.id)
}
