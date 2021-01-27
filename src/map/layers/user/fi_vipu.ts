import { addLayer, addSource, removeSource, removeLayer } from "src/map/map";
import { registerGroup, unregisterGroup } from "src/map/layer_groups";
import { fillOpacity } from "../../utils";
import { genericPopupHandler, createPopup } from "../../map";

import { addDataset, removeDataset } from "./common";

const URL_PREFIX = `${process.env.REACT_APP_API_URL}/user/data?file=`;

const addVipu = (token: string) => {
  addSource("fi-vipu-fields", {
    type: "geojson",
    data: `${URL_PREFIX}peltolohko.geojson&token=${token}`,
  });

  addLayer({
    id: "fi-vipu-fields-fill",
    source: "fi-vipu-fields",
    type: "fill",
    paint: {
      "fill-color": "yellow",
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

  genericPopupHandler("fi-vipu-fields-fill", (ev) => {
    let html = "";
    for (const f of ev.features) {
      const p = f.properties;

      html += `
        <p>
        Year: ${p["VUOSI"]}<br>
        Block number: ${p["PLOHKONRO"]}<br>
        </p>
        `;
    }

    createPopup(ev, html);
  });

  registerGroup("fi-vipu-fields", [
    "fi-vipu-fields-fill",
    "fi-vipu-fields-outline",
  ]);

  addSource("fi-vipu-growth", {
    type: "geojson",
    data: `${URL_PREFIX}kasvulohkogeometria.geojson&token=${token}`,
  });

  addLayer({
    id: "fi-vipu-growth-fill",
    source: "fi-vipu-growth",
    type: "fill",
    paint: {
      "fill-color": "green",
      "fill-opacity": fillOpacity,
    },
    BEFORE: "FILL",
  });

  addLayer({
    id: `fi-vipu-growth-outline`,
    source: "fi-vipu-growth",
    type: "line",
    paint: {
      "line-opacity": 1,
      "line-width": 1,
    },
    BEFORE: "OUTLINE",
  });

  genericPopupHandler("fi-vipu-growth-fill", (ev) => {
    let html = "";
    for (const f of ev.features) {
      const p = f.properties;

      html += `
        <p>
        Year: ${p["VUOSI"]}<br>
        Block number: ${p["PLTUNNUS"]}<br>
        Block type: ${p["KLTUNNUS"]}<br>
        Plant type: ${p["KASVI"]}<br>
        Strain type: ${p["LAJIKE"]}<br>
        Area: ${p["PINTA_ALA"]}ha<br>
        Organic: ${p["LUOMU"]}
        </p>
        `;
    }

    createPopup(ev, html);
  });

  registerGroup("fi-vipu-growth", [
    "fi-vipu-growth-fill",
    "fi-vipu-growth-outline",
  ]);
};

const removeVipu = () => {
  for (const layer of [
    "fi-vipu-fields-fill",
    "fi-vipu-fields-outline",
    "fi-vipu-growth-fill",
    "fi-vipu-growth-outline",
  ]) {
    removeLayer(layer);
  }

  removeSource("fi-vipu-fields");
  unregisterGroup("fi-vipu-fields");

  removeSource("fi-vipu-growth");
  unregisterGroup("fi-vipu-growth");
};

addDataset("fi-vipu", addVipu);
removeDataset("fi-vipu", removeVipu);
