import { observable } from "micro-observables";
import { MapboxGeoJSONFeature } from "mapbox-gl";

type SelectedFeature = { feature: MapboxGeoJSONFeature, layer: string, bounds: number[] }

const nullFeature = {feature: null, layer: null, bounds: null}
class SelectedFeatureService {
  private _selectedFeatures = observable<SelectedFeature>(nullFeature);

  get selectedFeature() {
    return this._selectedFeatures.readOnly();
  }
  selectFeature(props: SelectedFeature) {
    this._selectedFeatures.set(props)
  }
  unsetFeature() {
    this._selectedFeatures.set(nullFeature)
  }
}

export const selectedFeatureService = new SelectedFeatureService();
