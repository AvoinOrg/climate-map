import { useMapStore } from '#/common/store/mapStore'
import { getDrawMode } from '#/common/utils/map'
import MapboxDraw from '@mapbox/mapbox-gl-draw'

export const useDrawMode = () => {
  const options = useMapStore((state) => state._drawOptions)

  if (options.draw == null || options.isEnabled === false) {
    return null
  }

  const mapboxDrawMode = options.draw.getMode() as MapboxDraw.DrawMode

  return getDrawMode(mapboxDrawMode)
}
