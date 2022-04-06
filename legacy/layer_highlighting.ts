import {
  setFilter,
  addLayer,
  genericPopupHandler,
  querySourceFeatures,
} from "./map";
import { getGeoJsonGeometryBounds, assert } from "../src/map/utils";
import { Expression, MapboxGeoJSONFeature } from "mapbox-gl";

export interface ILayerOption {
  minzoom: number;
  maxzoom?: number;
  id: string;
}
export interface ILayerOptions {
  [s: string]: ILayerOption;
}

export type IRenderFeature = (
  feature: MapboxGeoJSONFeature,
  bounds: number[],
  layer: string
) => void;

export const createHighlightingForLayerGroup = (
  layerGroup: string,
  fillColor: Expression,
  layerOptions: ILayerOptions,
  renderFeature: IRenderFeature
) => {
  let selectedFeature: MapboxGeoJSONFeature;
  let selectedFeatureBounds: number[];
  let selectedFeatureLayer: string;

  const updateDetailVisibility = () => {
    if (selectedFeature) {
      document.querySelector(`.${layerGroup}-output`).removeAttribute("hidden");
      document
        .querySelector(`.${layerGroup}-empty`)
        .setAttribute("hidden", "hidden");
    } else {
      document
        .querySelector(`.${layerGroup}-output`)
        .setAttribute("hidden", "hidden");
      document.querySelector(`.${layerGroup}-empty`).removeAttribute("hidden");
    }
  };

  const init = (e: Event) => {
    const elem = e.target as HTMLInputElement;
    if (!elem.checked) {
      clearHighlights();
    }
  };
  document
    .querySelector(`input#${layerGroup}`)
    .addEventListener("change", init);

  const clearHighlights = () => {
    for (const sourceName of Object.keys(layerOptions)) {
      const idName = layerOptions[sourceName].id;
      setFilter(`${sourceName}-highlighted`, ["in", idName]);
    }
    selectedFeature = selectedFeatureBounds = selectedFeatureLayer = null;
    updateDetailVisibility();
  };

  for (const [type, opts] of Object.entries(layerOptions)) {
    const extraOpts = { "source-layer": "default" };
    addLayer({
      id: `${type}-fill`,
      source: type,
      type: "fill",
      paint: {
        "fill-color": fillColor,
      },
      minzoom: opts.minzoom,
      maxzoom: opts.maxzoom || 24,
      BEFORE: "FILL",
      ...extraOpts,
    });
    addLayer({
      id: `${type}-boundary`,
      source: type,
      type: "line",
      paint: {
        "line-opacity": 0.5,
      },
      minzoom: opts.minzoom,
      maxzoom: opts.maxzoom || 24,
      BEFORE: "OUTLINE",
      ...extraOpts,
    });

    addLayer({
      id: `${type}-highlighted`,
      source: type,
      type: "fill",
      paint: {
        "fill-outline-color": "#484896",
        "fill-color": "#6e599f",
        "fill-opacity": 0.4,
      },
      filter: ["in", opts.id],
      BEFORE: "OUTLINE",
      ...extraOpts,
    });
  }

  for (const sourceName of Object.keys(layerOptions)) {
    const layerName = `${sourceName}-fill`;
    // eslint-disable-next-line no-loop-func
    genericPopupHandler(layerName, (ev) => {
      const f = ev.features[0];

      // Only copy over currently selected features:
      const idName = layerOptions[sourceName].id;
      const id = f.properties[idName];
      assert(
        id !== undefined && id !== null,
        `Feature has no id: ${JSON.stringify(f.properties)}`
      );

      clearHighlights();
      const newFilter = ["in", idName, id];
      setFilter(`${sourceName}-highlighted`, newFilter);

      selectedFeatureBounds = querySourceFeatures(sourceName, "default")
        .filter((f) => f.properties[idName] === id)
        .map(
          (f) =>
            f.bbox || getGeoJsonGeometryBounds((f.geometry as any).coordinates)
        )
        .reduce(
          ([a1, b1, c1, d1], [a2, b2, c2, d2]) => [
            Math.min(a1, a2),
            Math.min(b1, b2),
            Math.max(c1, c2),
            Math.max(d1, d2),
          ],
          [999, 999, -999, -999]
        );

      selectedFeatureLayer = layerName;
      selectedFeature = f;

      renderFeature(
        selectedFeature,
        selectedFeatureBounds,
        selectedFeatureLayer
      );
      updateDetailVisibility();

      // TODO Force the menu (the info box) to appear if it's hidden now
    });
  }
};
