import { useMapStore } from '#/common/store'
import { MapboxGeoJSONFeature } from 'mapbox-gl'
import { useEffect, useState } from 'react'

const useFilteredSelectedFeatures = (filterLayers: string[]) => {
  const selectedFeatures = useMapStore((state) => state.selectedFeatures)
  const [filteredFeatures, setFilteredFeatures] = useState<
    MapboxGeoJSONFeature[]
  >([])

  useEffect(() => {
    const newFilteredFeatures = selectedFeatures.filter(
      (f: MapboxGeoJSONFeature) => {
        if (filterLayers.includes(f.layer.id)) {
          return true
        }
        return false
      }
    )

    setFilteredFeatures(newFilteredFeatures)
  }, [selectedFeatures])

  return filteredFeatures
}

export default useFilteredSelectedFeatures
