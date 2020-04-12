import { observable } from "micro-observables";
import { MapboxGeoJSONFeature } from "mapbox-gl";

type SelectedFeature = { feature: MapboxGeoJSONFeature, layer: string, bounds: number[] }

const nullFeature: SelectedFeature = {feature: null, layer: null, bounds: null}

const _selectedFeatures = observable<SelectedFeature>(nullFeature);

export const selectedFeature = _selectedFeatures.readOnly();

export const selectFeature = (props: SelectedFeature) => _selectedFeatures.set(props)
export const unsetFeature = () => _selectedFeatures.set(nullFeature)
