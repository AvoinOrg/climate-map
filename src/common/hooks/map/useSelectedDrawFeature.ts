import { useState, useEffect } from 'react'
import { useMapStore } from '#/common/store'

export const useSelectedDrawFeatures = () => {
  const _mbMap = useMapStore((state) => state._mbMap)
  const draw = useMapStore((state) => state._drawOptions.draw)

  const [selectedDrawFeatures, setSelectedDrawFeatures] = useState<
    GeoJSON.Feature[]
  >([])

  useEffect(() => {
    if (!_mbMap || !draw) return

    const handleSelectionChange = (e: any) => {
      if (e.features.length > 0) {
        setSelectedDrawFeatures(e.features)
      } else {
        setSelectedDrawFeatures([])
      }
    }

    _mbMap?.on('draw.selectionchange', handleSelectionChange)

    return () => {
      _mbMap?.off('draw.selectionchange', handleSelectionChange)
    }
  }, [_mbMap, draw])

  return selectedDrawFeatures
}
