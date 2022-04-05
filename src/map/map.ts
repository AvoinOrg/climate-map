import "ol/ol.css";
import {
  MapLayerMouseEvent,
  PopupOptions,
  Layer,
  AnySourceData,
  Style,
  Expression,
} from "mapbox-gl";
import { sanitize } from "dompurify";
import {
  // execWithMapLoaded,
  originalSourceDefs,
  originalLayerDefs,
  invertLayerTextHalo,
  assert,
} from "./utils";

import { boundingExtent } from "ol/extent";
import { fromLonLat } from "ol/proj";
import { get as getProjection } from "ol/proj";
import { MapBrowserEvent, MapBrowserPointerEvent } from "ol/src";
import GeoJSON, { GeoJSONFeatureCollection } from "ol/format/GeoJSON";
import LayerOL from "ol/layer/VectorTile";
import Map from "ol/Map";
import MVT from "ol/format/MVT";
import olms from "ol-mapbox-style";
import Overlay from "ol/Overlay";
import RenderFeature from "ol/src/render/Feature";
import SourceType from "ol/source/Source";
import stylefunction from "ol-mapbox-style/dist/stylefunction";
import TileGrid from "ol/tilegrid/TileGrid";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource, { Options } from "ol/source/VectorTile";
import View from "ol/View";
import XYZ from "ol/source/XYZ";

const projection = getProjection("EPSG:3857");

const popupContainer = document.createElement("div");
popupContainer.innerHTML = `
<div id="popup" class="ol-popup">
    <a href="#" id="popup-closer" class="ol-popup-closer"></a>
    <div id="popup-content"></div>
</div>
`;
document.body.appendChild(popupContainer);

const popupContent = document.getElementById("popup-content") as HTMLElement;
const popupCloser = document.getElementById("popup-closer") as HTMLElement;

const popupOverlay = new Overlay({
  element: popupContainer,
  autoPan: true,
  autoPanAnimation: {
    duration: 250,
  },
});

popupCloser.onclick = () => {
  popupOverlay.setPosition(undefined);
  popupCloser.blur();
  return false;
};

export const map = new Map({
  // @ts-ignore TODO update to ol 6 types once available - 'renderer' not known in 5.x
  renderer: "webgl",
  target: "map",
  overlays: [popupOverlay],
  view: new View({
    center: fromLonLat([28, 65]),
    // projection,
    minZoom: 0,
    zoom: 5,
  }),
});

olms(map, "https://tiles.stadiamaps.com/styles/alidade_smooth.json");

declare module "mapbox-gl" {
  export interface Layer {
    BEFORE?: string;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const sampleStyle = {
  version: 8,
  name: "export",
  sources: {
    "nibio-ar50": {
      type: "vector",
      tiles: [
        "https://server.avoin.org/data/map/nibio-ar50/{z}/{x}/{y}.pbf.gz?v=1",
      ],
      minzoom: 0,
      maxzoom: 12,
      attribution: '<a href="https://nibio.no/">© NIBIO</a>',
    },
  },
  layers: [
    {
      id: "nibio-ar50-forests-fill",
      source: "nibio-ar50",
      "source-layer": "default",
      filter: ["==", ["get", "arealtype"], 30],
      type: "fill",
      paint: {
        "fill-color": "rgba(200,2000,0,0.5)",
        "fill-opacity": 0.65,
      },
      BEFORE: "FILL",
    },
    {
      id: "nibio-ar50-forests-outline",
      source: "nibio-ar50",
      "source-layer": "default",
      filter: ["==", ["get", "arealtype"], 30],
      type: "line",
      minzoom: 9,
      paint: {
        "line-opacity": 0.5,
      },
      BEFORE: "OUTLINE",
    },
  ],
};
export const addSource = (name: string, source: mapboxgl.AnySourceData) => {
  originalSourceDefs[name] = source;
  directAddSource(name, source);
};

export const addImage = (name: string, image: HTMLImageElement) => {
  // execWithMapLoaded(() => map.addImage(name, image));
  console.log("addImage", name, image);
};

export const removeMapEventHandler = (
  type: string,
  listener: (ev: any) => void
) => {
  console.log("removeMapEventHandler", type, listener);
  // map.off(type, listener);
};

// Calculation of tile urls for zoom levels 1, 3, 5, 7, 9, 11, 13, 15.
const resolutions: number[] = [];
for (let i = 0; i <= 8; ++i) {
  resolutions.push(156543.03392804097 / Math.pow(2, i * 2));
}

const tileUrlFunction = (url: string, tileCoord: number[]) =>
  url
    .replace("{z}", String(tileCoord[0] * 2 - 1))
    .replace("{x}", String(tileCoord[1]))
    .replace("{y}", String(tileCoord[2]))
    .replace(
      "{a-d}",
      "abcd".substr(((tileCoord[1] << tileCoord[0]) + tileCoord[2]) % 4, 1)
    );

const mbSourceToSource: (
  source: mapboxgl.AnySourceData
) => SourceType | null = (source: mapboxgl.AnySourceData) => {
  switch (source.type) {
    case "geojson":
      // TODO implement geojson URL fetch
      // if (typeof source.data === 'string') return null;
      const data =
        typeof source.data === "string"
          ? `{"type": "FeatureCollection","features":[]}`
          : source.data;
      assert(source.data, source);
      return new VectorSource({
        features: new GeoJSON().readFeatures(data as GeoJSONFeatureCollection),
      });
    case "vector":
      const opts: Options = {
        // @ts-ignore
        format: new MVT(),
        tileGrid: new TileGrid({
          extent: projection.getExtent(),
          resolutions,
          tileSize: 512,
        }),
        tileUrlFunction: (coord: number[]) =>
          tileUrlFunction(source.tiles![0], coord),
      };
      if (source.attribution) {
        opts.attributions = source.attribution;
      }
      return new VectorTileSource(opts);
    case "raster":
      assert(
        source.tiles!.length === 1,
        `Source URL: ${JSON.stringify(source)}`
      );
      return new XYZ({ url: source.tiles![0] }); // TODO multiple tile URLs?
    default:
      return null;
  }
};

// @ts-ignore
const mbLayerToLayer: (layer: mapboxgl.Layer) => LayerOL | null = (layer) => {
  const source = sources[layer.source as string];
  switch (layer.type) {
    case "raster":
      // @ts-ignore
      return new TileLayer({ source });
    case "fill":
    case "line":
    case "circle":
    case "symbol":
      const sourceType = sourceTypes[layer.source as string];
      if (sourceType === "geojson") {
        // @ts-ignore
        return new VectorLayer({ source });
      } else {
        // @ts-ignore
        return new VectorTileLayer({ source, declutter: true });
      }
    default:
      return null;
  }
};

interface IZIndexes {
  [s: string]: number;
}
const zIndexes: IZIndexes = {
  BACKGROUND: 10,
  FILL: 100,
  OUTLINE: 200,
  BG_LABEL: 300,
  LABEL: 400,
  TOP: 500,
};

// TODO: figure out geojson
interface ISource {
  [id: string]: SourceType;
}
interface ILayer {
  [id: string]: LayerOL;
}
interface ISourceType {
  [id: string]: string;
}
interface IMapLayer {
  [id: string]: boolean;
}
const sources: ISource = {};
const layers: ILayer = {};
const sourceTypes: ISourceType = {}; // TODO: get source type somewhere else..
const mapLayers: IMapLayer = {};

interface IOLUIDToName {
  [id: string]: string;
}
const olUIDToLayerName: IOLUIDToName = {};

interface IMBSource {
  [id: string]: AnySourceData;
}
interface IMBLayer {
  [id: string]: Layer;
}
const mbSources: IMBSource = {};
const mbLayers: IMBLayer = {};

export const directAddSource = (id: string, source: mapboxgl.AnySourceData) => {
  const source2 = mbSourceToSource(source);
  if (!source2) {
    return console.error(`Unknown source type for "${id}": ${source.type}`);
  }
  sourceTypes[id] = source.type;
  mbSources[id] = source;
  sources[id] = source2;
};

const setLayerMBStyle = (layerId: string) => {
  const layer = mbLayers[layerId];
  const layer2 = layers[layer.id];
  const styleDef: Style = {
    version: 8,
    name: "export",
    sources: { [layer.source as string]: mbSources[layer.source as string] },
    // @ts-ignore
    layers: [layer],
  };
  stylefunction(layer2, styleDef, layer.source as string);
};

export const directAddLayer = (layer: mapboxgl.Layer, before?: string) => {
  assert(layer.source, `source is required for layer "${layer.id}`);

  if (typeof layer.source !== "string") {
    directAddSource(layer.id, layer.source!);
    layer.source = layer.id;
  }
  const layer2 = mbLayerToLayer(layer);
  if (!layer2) {
    return console.error(
      `Unknown source type for "${layer.id}": ${layer.type}`
    );
  }

  const zIndex = zIndexes[before || layer.BEFORE || "BACKGROUND"];
  layer2.setZIndex(zIndex);
  mbLayers[layer.id] = layer;
  layers[layer.id] = layer2;
  // @ts-ignore TODO figure out a better way to map layer names/ids around
  olUIDToLayerName[layer2.ol_uid] = layer.id;

  layer.layout = layer.layout || {};

  if (layer2 instanceof VectorLayer || layer2 instanceof VectorTileLayer) {
    setLayerMBStyle(layer.id);
  }

  setLayoutProperty(layer.id, "visibility", layer.layout.visibility);
};

export const getLayer = (layer: string) => layers[layer];

export const removeLayer = (id: string) => {
  const layer = layers[id];
  map.removeLayer(layer);
  mapLayers[id] = false;
  delete layers[id];
};

export const moveLayer = (layer: string, before?: string) => {}; // Don't move anything in ol, for now.

const lineDefaults: Object = {
  "line-color": "black",
  "line-width": 1,
};

export const addLayer = (layer: Layer, visibility = "none") => {
  assert(
    "BEFORE" in layer,
    `Layer ${layer.id} is missing a BEFORE declaration`
  );

  layer.layout = layer.layout || {};
  layer.layout.visibility = visibility === "visible" ? "visible" : "none";
  layer.paint = layer.paint || {};
  originalLayerDefs[layer.id] = layer;
  if (layer.type === "line") {
    for (const [key, value] of Object.entries(lineDefaults)) {
      if (key in layer.paint) continue;
      // @ts-ignore
      layer.paint[key] = value;
    }
  }
  directAddLayer({ layout: layer.layout, ...layer }, layer.BEFORE);
};

export const toggleBaseMapSymbols = () => {
  getMapLayers()
    .filter((x) => x.type === "symbol")
    .forEach(invertLayerTextHalo);
};

const coordFromRenderFeature = (f: RenderFeature) => {
  const c1 = f.getFlatCoordinates();
  const res = [];
  for (let i = 0; i < c1.length; i += 2) {
    res.push([c1[i], c1[i + 1]]);
  }
  return [res];
};
const normalizeFeature = (f: RenderFeature) => ({
  properties: f.getProperties(),
  geometry: {
    type: f.getType(),
    coordinates: coordFromRenderFeature(f),
  },
  renderFeature: f,
});

export const genericPopupHandler: (
  layerId: string | string[],
  fn: (e: MapLayerMouseEvent) => void
) => void = (layerId, fn) => {
  if (Array.isArray(layerId)) {
    return layerId.forEach((l) => genericPopupHandler(l, fn));
  }

  map.on("click", function (event: MapBrowserEvent) {
    const features = map.getFeaturesAtPixel(event.pixel, {
      // @ts-ignore TODO ol_uid
      layerFilter: (l: string) => layerId === olUIDToLayerName[l.ol_uid],
    });

    if (features.length === 0) return;

    const ev = event as any;
    ev.features = features.map(normalizeFeature);
    fn(ev as MapLayerMouseEvent);
  });
};

export const createPopup = (
  ev: MapLayerMouseEvent,
  html: string,
  options?: PopupOptions
) => {
  const evt = ev as any as MapBrowserPointerEvent;
  popupOverlay.setPosition(evt.coordinate);
  popupContent.innerHTML = sanitize(html);
};

export const setLayoutProperty = (
  layerId: string,
  name: string,
  value: any
) => {
  if (name === "visibility") {
    const layer = mbLayers[layerId];
    const layer2 = layers[layerId];
    layer.layout!.visibility = value;

    const isVisibleNow = value === "visible";
    if (isVisibleNow && !mapLayers[layerId]) {
      // layer2.setVisible(true); // do this too?
      map.addLayer(layer2);
      mapLayers[layerId] = true;
    } else if (!isVisibleNow && mapLayers[layerId]) {
      layer2.setVisible(false);
      map.removeLayer(layer2); // do this too?
      mapLayers[layerId] = false;
    } // else: already visible or not visible, as it is supposed to be
  } else {
    console.error("Unhandled layoutProperty", layerId, name, value);
  }
};

export const setPaintProperty = (
  layerId: string,
  name: string,
  value: Expression | string | number
) => {
  const layer = mbLayers[layerId];
  // @ts-ignore
  layer.paint[name] = value;
  setLayerMBStyle(layerId);
};

export const setFilter = (layerId: string, filter: any[]) => {
  const layer = mbLayers[layerId];
  layer.filter = filter;
  setLayerMBStyle(layerId);
};

export const isSourceReady = (sourceLayer: string) => {
  return true;
  // try {
  //   if (map.getSource(sourceLayer) && map.isSourceLoaded(sourceLayer)) {
  //     return true;
  //   }
  // } catch (error) {
  //   return false;
  // }
  // return false;
};

export const fitBounds = (
  bbox: number[],
  lonExtra: number,
  latExtra: number
) => {
  const [lonMin, latMin, lonMax, latMax] = bbox;
  const lonDiff = lonMax - lonMin;
  const latDiff = latMax - latMin;
  return new View({
    extent: boundingExtent([
      [lonMin - lonDiff * lonExtra, latMin - latDiff * latExtra],
      [lonMax + lonDiff * lonExtra, latMax + latDiff * latExtra],
    ]),
  });
};

export const zoomTo = (zoom: number) => {
  new View({ zoom }).animate();
};

export const panTo = (lon: number, lat: number) =>
  new View({ center: fromLonLat([lon, lat]) }).animate();

export const flyTo = (lon: number, lat: number, zoom: number) =>
  new View({ center: fromLonLat([lon, lat]), zoom });

// @ts-ignore
export const querySourceFeatures: (
  id: string,
  sourceLayer: string
) => mapboxgl.MapboxGeoJSONFeature[] = (
  layerId: string,
  sourceLayer: string
) => {
  const features = map.getFeaturesAtPixel([0, 0], {
    hitTolerance: 1e99,
    // @ts-ignore TODO ol_uid
    layerFilter: (l: string) => layerId === olUIDToLayerName[l.ol_uid],
  });
  return features.map(normalizeFeature);
};

export const getSource = (id: string) => sources[id];
export const removeSource = (id: string) => {
  delete sources[id]; // TODO: remove dependencies? Or flag that deps exist?
};

// TODO implement
export const getBounds: () => mapboxgl.LngLatBounds = () => {
  console.warn("getBounds not yet implemented for OpenLayers shim");
  const view = map.getView();
  const resolution = view.getResolution();
  const [lon, lat] = view.getCenter();
  const size = map.getSize();
  console.log(getBounds, "getBounds", lon, lat, size, resolution, map, view);
  return null as mapboxgl.LngLatBounds;
};

// TODO a different sort of Layer is returned now
// @ts-ignore
export const getMapLayers: () => Layer[] = () => map.getLayers().getArray();

export const addMapEventHandler = (type: string, listener: (ev: any) => void) =>
  // @ts-ignore
  map.on(type, listener);

// Nothing to do
export const mapInit = () => {};

// Already loaded
export const onMapLoad = (fn: () => void) => fn();

export const isMapLoaded = () => true;

// TODO
export const getGeocoder = () => null;
export const mapRelocate = () => {};
export const mapResetNorth = () => {};
export const mapToggleTerrain = () => {};
export const mapZoomIn = () => {};
export const mapZoomOut = () => {};
