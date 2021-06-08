import { addLayer, addSource, addImage } from "src/map/map";
import { registerGroup } from "src/map/layer_groups";
import Marker from "../../marker.svg";

const marker = new Image(50, 50);
marker.src = Marker;

interface IHashParams {
  secret: string;
}
const hashParams: IHashParams = window.location.search
  .replace(/^[#?]*/, "")
  .split("&")
  .reduce(
    (prev, item) =>
      Object.assign({ [item.split("=")[0]]: item.split("=")[1] }, prev),
    {}
  ) as IHashParams;

const URL_PREFIX = `https://${hashParams.secret}.cloudfront.net`;

addSource("fao-images-2021-polygons", {
  type: "geojson",
  data: `${URL_PREFIX}/fao.geojson`,
});

addSource("fao-images-2021-centroids", {
  type: "geojson",
  data: `${URL_PREFIX}/fao_centroids.geojson`,
});

addSource("fao-images-2021-tiles", {
  type: "raster",
  tiles: [`${URL_PREFIX}/tiles/{z}/{x}/{y}.png`],
  minzoom: 2,
  maxzoom: 18,
});

addLayer({
  id: "fao-images-2021-boundary",
  source: "fao-images-2021-polygons",
  type: "line",
  paint: {
    "line-color": "white",
    "line-width": 2,
  },
  BEFORE: "FILL",
  filter: ["!in", "id"],
});

addLayer({
  id: "fao-images-2021-boundary2",
  source: "fao-images-2021-polygons",
  type: "line",
  paint: {
    "line-color": "black",
    "line-width": 1,
  },
  BEFORE: "FILL",
  filter: ["!in", "id"],
});


addLayer({
  id: "fao-images-2021-raster",
  source: "fao-images-2021-tiles",
  type: "raster",
  BEFORE: "FILL",
});

addLayer({
  id: `fao-images-2021-label`,
  source: "fao-images-2021-centroids",
  type: "symbol",
  maxzoom: 13,
  minzoom: 4,
  layout: {
    "text-font": ["Open Sans Regular"],
    "text-size": 20,
    "text-offset": [0, 0.8],
    "text-field": ["get", "id"],
  },
  paint: {
    "text-halo-width": 2,
    "text-halo-blur": 1,
    "text-halo-color": "rgb(242,243,240)",
  },
  filter: ["!in", "id"],
  BEFORE: "TOP",
});

addImage("marker", marker);

addLayer({
  id: "fao-images-2021-pin",
  source: "fao-images-2021-centroids",
  type: "symbol",
  maxzoom: 13,
  layout: {
    visibility: "visible",
    "symbol-placement": "point",
    "icon-image": "marker",
    "icon-anchor": "bottom",
    "icon-ignore-placement": true,
    "icon-allow-overlap": true,
  },
  filter: ["!in", "id"],
  BEFORE: "FILL",
});

registerGroup("fao-images-2021", [
  "fao-images-2021-boundary",
  "fao-images-2021-boundary2",
  "fao-images-2021-raster",
  "fao-images-2021-label",
  "fao-images-2021-pin",
]);
