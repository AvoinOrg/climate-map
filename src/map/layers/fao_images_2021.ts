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
  id: "fao-images-2021-fill",
  source: "fao-images-2021-polygons",
  type: "fill",
  paint: {
    "fill-color": "#6e599f",
  },
  filter: ["!in", "id"],
  BEFORE: "FILL",
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
  maxzoom: 12,
  minzoom: 4,
  layout: {
    "text-font": ["Open Sans Regular"],
    "text-size": 20,
    "text-offset": [0, 0.8],
    "text-field": ["get", "id"],
  },
  filter: ["!in", "id"],
  BEFORE: "TOP",
});

addImage("marker", marker);

addLayer({
  id: "fao-images-2021-pin",
  source: "fao-images-2021-centroids",
  type: "symbol",
  maxzoom: 12,
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

// addLayer({
//   'id': `fi-omaihka-circle-locator`,
//   'source': 'fi-omaihka-overlay',
//   'type': 'circle',
//   'maxzoom': 11,
//   "paint": {
//     'circle-color': 'red',
//     'circle-radius': {
//       'base': 20,
//       'stops': [
//         [0, 50],
//         [10, 100]
//       ]
//     },
//   },
//   BEFORE: 'BG_LABEL',
// })

// genericPopupHandler(['fi-omaihka-soil-topsoil-fill', 'fi-omaihka-soil-subsoil-fill'], e => {
//   const f = e.features[0];
//   const p = f.properties;

//   let html = '<table>'
//   for (const [k, v] of Object.entries(p)) {
//     html += `<tr><th>${k}</th><td>${v}</td></tr>`
//   }
//   html += '</table>'

//   createPopup(e, html, { maxWidth: '480px' });
// });

// addLayer({
//   'id': `fi-omaihka-soils-highlighted`,
//   "source": 'fi-omaihka-soils',
//   "type": 'fill',
//   "paint": {
//     "fill-outline-color": "#484896",
//     "fill-color": "#6e599f",
//     "fill-opacity": 0.4
//   },
//   "filter": ["in", 'lohko'],
//   BEFORE: 'OUTLINE',
// });

registerGroup("fao-images-2021", [
  "fao-images-2021-fill",
  "fao-images-2021-raster",
  "fao-images-2021-label",
  "fao-images-2021-pin",
]);
