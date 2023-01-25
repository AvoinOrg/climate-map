import { MapContext } from '#/components/Map'
import { MapboxGeoJSONFeature } from 'mapbox-gl'
import { useContext, useEffect, useState } from 'react'

export const useFilteredSelectedFeatures = (filterLayers: string[]) => {
  const { selectedFeatures } = useContext(MapContext)
  const [filteredFeatures, setFilteredFeatures] = useState<MapboxGeoJSONFeature[]>([])

  useEffect(() => {
    const newFilteredFeatures = selectedFeatures.filter((f: MapboxGeoJSONFeature) => {
      if (filterLayers.includes(f.layer.id)) {
        return true
      }
      return false
    })

    setFilteredFeatures(newFilteredFeatures)
  }, [selectedFeatures])

  return filteredFeatures
}
