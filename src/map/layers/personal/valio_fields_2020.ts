import { addLayer, addSource, removeSource, removeLayer } from "src/map/map";
import { registerGroup, unregisterGroup } from "src/map/layer_groups";
import { fillOpacity } from "../../utils";
import { genericPopupHandler, createPopup } from "../../map";

import { addDataset, removeDataset } from "./common";

const URL_PREFIX = `${process.env.REACT_APP_API_URL}/user/data?file=`;

const addValioFields2020 = (token: string) => {
  addSource("valio-fields-2020", {
    type: "geojson",
    data: `${URL_PREFIX}valio-fields-2020.geojson&token=${token}`,
  });

  addLayer({
    id: "valio-fields-2020-fill",
    source: "valio-fields-2020",
    type: "fill",
    paint: {
      "fill-color": "yellow",
      "fill-opacity": fillOpacity,
    },
    BEFORE: "FILL",
  });

  addLayer({
    id: `valio-fields-2020-outline`,
    source: "valio-fields-2020",
    type: "line",
    paint: {
      "line-opacity": 1,
      "line-width": 1,
    },
    BEFORE: "OUTLINE",
  });

  genericPopupHandler("valio-fields-2020-fill", (ev) => {
    let html = "";
    for (const f of ev.features) {
      const p = f.properties;

      html += `
        <p>
        Vuosi: ${p["VUOSI"]}<br>
        Peruslohko: ${p["PERUSLOHKO"]}<br>
        Tilatunnus: ${p["TILATUNNUS"]}<br>
        Pinta-ala: ${p["PINTA_ALA"] / 100} ha<br>
        </p>
        `;
    }

    createPopup(ev, html);
  });

  registerGroup("valio-fields-2020", [
    "valio-fields-2020-fill",
    "valio-fields-2020-outline",
  ]);
};

const removeValioFields2020 = () => {
  for (const layer of ["valio-fields-2020-fill", "valio-fields-2020-outline"]) {
    removeLayer(layer);
  }

  removeSource("valio-fields-2020");
  unregisterGroup("valio-fields-2020");
};

addDataset("valio-fields-2020", addValioFields2020);
removeDataset("valio-fields-2020", removeValioFields2020);
