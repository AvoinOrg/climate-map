import { useMapStore } from '#/common/store/mapStore'

export const useDoesLayerGroupExist = (layerGroupId: string) => {
  const doesLayerGroupExist = useMapStore(
    (state) => state._layerGroups[layerGroupId] != null
  )

  return useDoesLayerGroupExist
}
