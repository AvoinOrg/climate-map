import { useMapStore } from '#/common/store/mapStore'

export const useIsLayerGroupHidden = (layerGroupId: string): boolean => {
  const layerGroup = useMapStore((state) => state._layerGroups[layerGroupId])

  // If the layerGroupId doesn't exist in the store,
  // we default to true (i.e., it's hidden).
  return layerGroup?.isHidden ?? true
}
