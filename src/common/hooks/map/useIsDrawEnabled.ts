import { useMapStore } from '#/common/store/mapStore'

export const useIsDrawEnabled = () => {
  const options = useMapStore((state) => state._drawOptions)

  return options.isEnabled
}
