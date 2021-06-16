import { addLayer, addSource, removeSource, removeLayer } from "src/map/map";
import { registerGroup, unregisterGroup } from "src/map/layer_groups";
import { fillOpacity } from "../../utils";
import { genericPopupHandler, createPopup } from "../../map";

import { addDataset, removeDataset } from "./common";

const URL_PREFIX = `${process.env.REACT_APP_API_URL}/user/data?file=`;

const addVipu = (token: string) => {
  addSource("vipu-fields", {
    type: "geojson",
    data: `${URL_PREFIX}peltolohko.geojson&token=${token}`,
  });

  addLayer({
    id: "vipu-fields-fill",
    source: "vipu-fields",
    type: "fill",
    paint: {
      "fill-color": "yellow",
      "fill-opacity": fillOpacity,
    },
    BEFORE: "FILL",
  });

  addLayer({
    id: `vipu-fields-outline`,
    source: "vipu-fields",
    type: "line",
    paint: {
      "line-opacity": 1,
      "line-width": 1,
    },
    BEFORE: "OUTLINE",
  });

  genericPopupHandler("vipu-fields-fill", (ev) => {
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

  registerGroup("vipu-fields", [
    "vipu-fields-fill",
    "vipu-fields-outline",
  ]);

  addSource("vipu-growth", {
    type: "geojson",
    data: `${URL_PREFIX}kasvulohkogeometria.geojson&token=${token}`,
  });

  addLayer({
    id: "vipu-growth-fill",
    source: "vipu-growth",
    type: "fill",
    paint: {
      "fill-color": "green",
      "fill-opacity": fillOpacity,
    },
    BEFORE: "FILL",
  });

  addLayer({
    id: `vipu-growth-outline`,
    source: "vipu-growth",
    type: "line",
    paint: {
      "line-opacity": 1,
      "line-width": 1,
    },
    BEFORE: "OUTLINE",
  });

  genericPopupHandler("vipu-growth-fill", (ev) => {
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

  registerGroup("vipu-growth", [
    "vipu-growth-fill",
    "vipu-growth-outline",
  ]);
};

const removeVipu = () => {
  for (const layer of [
    "vipu-fields-fill",
    "vipu-fields-outline",
    "vipu-growth-fill",
    "vipu-growth-outline",
  ]) {
    removeLayer(layer);
  }

  removeSource("vipu-fields");
  unregisterGroup("vipu-fields");

  removeSource("vipu-growth");
  unregisterGroup("vipu-growth");
};

addDataset("vipu", addVipu);
removeDataset("vipu", removeVipu);
