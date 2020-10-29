import {
  addLayer,
  addSource,
  removeSource,
  removeLayer,
  genericPopupHandler,
  createPopup,
} from "src/map/map";
import { Expression } from "mapbox-gl";
import { registerGroup, unregisterGroup } from "src/map/layer_groups";
import { fillOpacity } from "../../utils";

import { addDataset, removeDataset } from "./common";

const fillColorSoil: (codeAttr: string) => Expression = (codeAttr) => [
  "match",
  ["get", codeAttr],

  // {"pintamaalaji_koodi":195111,"pintamaalaji":"Kalliomaa (Ka) RT"}
  195111,
  "#adaaaa",
  // {"pintamaalaji_koodi":195210,"pintamaalaji":"Sekalajitteinen maalaji, päälajitetta ei selvitetty (SY) RT"}
  195210,
  "#b0a978",
  // {"pintamaalaji_koodi":195310,"pintamaalaji":"Karkearakeinen maalaji, päälajitetta ei selvitetty (KY) RT"}
  195310,
  "#a39952",
  // {"pintamaalaji_koodi":195410,"pintamaalaji":"Hienojakoinen maalaji, päälajitetta ei selvitetty (HY) RT"}
  195410,
  "#d4be1e",
  // {"pintamaalaji_koodi":195413,"pintamaalaji":"Savi (Sa) RT"}
  195413,
  "#9c4699",
  // {"pintamaalaji_koodi":19551822,"pintamaalaji":"Soistuma (Tvs) RT"}
  19551822,
  "#397d69",
  // {"pintamaalaji_koodi":19551891,"pintamaalaji":"Ohut turvekerros (Tvo) RT"}
  19551891,
  "#a85858",
  // {"pintamaalaji_koodi":19551892,"pintamaalaji":"Paksu turvekerros (Tvp) RT"}
  19551892,
  "#960c0c",
  // {"pintamaalaji_koodi":195603,"pintamaalaji":"Vesi (Ve)"}
  195603,
  "#4c3cfa",

  "black", // fallback - should not happen.
];

const URL_PREFIX = `${process.env.REACT_APP_API_URL}/user/data?file=`;

const addVipu = (token: string) => {
  addSource("fi-vipu-fields", {
    type: "geojson",
    data: `${URL_PREFIX}peltolohkoraja.geojson&token=${token}`,
  });

  addLayer({
    id: "fi-vipu-fields-fill",
    source: "fi-vipu-fields",
    type: "fill",
    paint: {
      "fill-color": "green",
      "fill-opacity": fillOpacity,
    },
    BEFORE: "FILL",
  });

  addLayer({
    id: `fi-vipu-fields-outline`,
    source: "fi-vipu-fields",
    type: "line",
    paint: {
      "line-opacity": 1,
      "line-width": 1,
    },
    BEFORE: "OUTLINE",
  });

  // genericPopupHandler("fi-vipu-fields-fill", (ev) => {
  //   let html = "";
  //   for (const f of ev.features) {
  //     const p = f.properties;

  //     html += `
  //       <p>
  //       Block number: ${p["PLOHKONRO"]}
  //       Year: ${p["VUOSI"]}
  //       </p>
  //       `;
  //   }

  //   createPopup(ev, html);
  // });

  registerGroup("fi-vipu-fields", [
    "fi-vipu-fields-fill",
    "fi-vipu-fields-outline",
  ]);
};

const removeVipu = () => {
  for (const layer of ["fi-vipu-fields-fill", "fi-vipu-fields-outline"]) {
    removeLayer(layer);
  }
  removeSource("fi-vipu-fields");
  unregisterGroup("fi-vipu-fields");
};

addDataset("fi-vipu-fields", addVipu);
removeDataset("fi-vipu-fields", removeVipu);
