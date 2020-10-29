import { addLayer, addSource, removeSource, removeLayer } from "src/map/map";
import { registerGroup, unregisterGroup } from "src/map/layer_groups";
import { fillOpacity } from "../../utils";

import { addDataset, removeDataset } from "./common";

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
