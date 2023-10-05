import { useMapStore } from '#/common/store/mapStore'

export const useIsDrawDeleteAllowed = () => {
  const options = useMapStore((state) => state._drawOptions)

  return options.deleteEnabled
}
