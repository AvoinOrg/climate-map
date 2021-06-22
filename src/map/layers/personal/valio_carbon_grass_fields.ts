import { addLayer, addSource, removeSource, removeLayer } from "src/map/map";
import { registerGroup, unregisterGroup } from "src/map/layer_groups";
import { fillOpacity } from "../../utils";
import { genericPopupHandler, createPopup } from "../../map";

import { addDataset, removeDataset } from "./common";

const URL_PREFIX = `${process.env.REACT_APP_API_URL}/user/data?file=`;

const addValioFields2020 = (token: string) => {
  addSource("valio-carbon-grass-fields", {
    type: "geojson",
    data: `${URL_PREFIX}valio-carbon-grass-fields.geojson&token=${token}`,
  });

  addLayer({
    id: "valio-carbon-grass-fields-fill",
    source: "valio-carbon-grass-fields",
    type: "fill",
    paint: {
      "fill-color": "yellow",
      "fill-opacity": fillOpacity,
    },
    BEFORE: "FILL",
  });

  addLayer({
    id: `valio-carbon-grass-fields-outline`,
    source: "valio-carbon-grass-fields",
    type: "line",
    paint: {
      "line-opacity": 1,
      "line-width": 1,
    },
    BEFORE: "OUTLINE",
  });

  genericPopupHandler("valio-carbon-grass-fields-fill", (ev) => {
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

  registerGroup("valio-carbon-grass-fields", [
    "valio-carbon-grass-fields-fill",
    "valio-carbon-grass-fields-outline",
  ]);
};

const removeValioFields2020 = () => {
  for (const layer of ["valio-carbon-grass-fields-fill", "valio-carbon-grass-fields-outline"]) {
    removeLayer(layer);
  }

  removeSource("valio-carbon-grass-fields");
  unregisterGroup("valio-carbon-grass-fields");
};

addDataset("valio-carbon-grass-fields", addValioFields2020);
removeDataset("valio-carbon-grass-fields", removeValioFields2020);
