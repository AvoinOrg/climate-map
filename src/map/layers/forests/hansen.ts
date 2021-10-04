import { addSource, addLayer } from "../../map";
import { registerGroup } from "src/map/layer_groups";

const URL_PREFIX = `https://server.avoin.org/data/map/hansen/`;

addSource("hansen-treecover-tiles", {
  type: "raster",
  tiles: [URL_PREFIX + "treecover/tiles/{z}/{x}/{y}.png"],
  maxzoom: 7,
  attribution:
    '<a href="https://developers.google.com/earth-engine/datasets/catalog/UMD_hansen_global_forest_change_2020_v1_8">Hansen/UMD/Google/USGS/NASAESA</a>',
});

addSource("hansen-gainloss-tiles", {
  type: "raster",
  tiles: [URL_PREFIX + "gainloss/tiles/{z}/{x}/{y}.png"],
  maxzoom: 7,
  attribution:
    '<a href="https://developers.google.com/earth-engine/datasets/catalog/UMD_hansen_global_forest_change_2020_v1_8">Hansen/UMD/Google/USGS/NASAESA</a>',
});

addLayer({
  id: "hansen-treecover-raster",
  source: "hansen-treecover-tiles",
  type: "raster",
  minzoom: 0,
  paint: {
    "raster-opacity": 1,
  },
  BEFORE: "FILL",
});

addLayer({
  id: "hansen-gainloss-raster",
  source: "hansen-gainloss-tiles",
  type: "raster",
  minzoom: 0,
  paint: {
    "raster-opacity": 1,
  },
  BEFORE: "FILL",
});

registerGroup("hansen", ["hansen-treecover-raster", "hansen-gainloss-raster"]);
