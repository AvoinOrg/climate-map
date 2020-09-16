import { observable } from "micro-observables";
import { MapboxGeoJSONFeature } from "mapbox-gl";

type SelectedFeature = { feature: MapboxGeoJSONFeature, layer: string, bounds: number[] }

const _selectedFeatures = observable<SelectedFeature[]>([]);

export const selectedFeatures = _selectedFeatures.readOnly();

// Toggle feature selection
// NB: Requres feature.id to be set!
export const selectFeature = (props: SelectedFeature) => _selectedFeatures.update(
  fs => {
    const newId = props.feature.id
    const ids = fs.map(f => f.feature.id)
    const exists = ids.includes(newId)
    return exists
      ? fs.filter(f => f.feature.id !== newId)
      : fs.concat([props])
  })

  export const unsetFeatures = () => _selectedFeatures.set([])
