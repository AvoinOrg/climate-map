import { registerGroup } from '../layer_groups'
import { addLayer, addSource } from '../map'


interface EkofolioArea {
    name: string;
    zoom: number;
    center: number[];
}

export const ekofolioAreas: EkofolioArea[] = [
    {"name": "E190612-3 Tamme EMV", "zoom": 15, "center": [22.967112064361572,58.3833302391285]},
]

addSource('ekofolio-areas', {
  "type": 'geojson',
  'data': {
    "type":"FeatureCollection","features":[{"type":"Feature","properties":{"name":"E190612-3 Tamme EMV"},"geometry":{"type":"Polygon","coordinates":[[[22.967112064361572,58.3833302391285],[22.97439694404602,58.3870027924033],[22.974987030029297,58.38906105472041],[22.971972227096558,58.388532441436894],[22.97093152999878,58.387756377792556],[22.97219753265381,58.38711526885689],[22.967101335525513,58.38410640017399],[22.967283725738525,58.38396016823935],[22.967004776000973,58.38390954935151],[22.967112064361572,58.3833302391285]]]}}]
  },
})

addLayer({
  'id': 'ekofolio-areas-sym',
  'source': 'ekofolio-areas',
  'type': 'symbol',
  'paint': {
      'text-color': "#999",
      'text-halo-blur': 1,
      'text-halo-color': "rgb(242,43,40)",
      'text-halo-width': 2,
  },
  "layout": {
      "symbol-placement": "point",
      "text-font": ["Open Sans Regular"],
      "text-size": 20,
      "text-field": ["get", "name"],
  },
  BEFORE: 'LABEL',
})

addLayer({
  'id': 'ekofolio-areas-boundary',
  'source': 'ekofolio-areas',
  'type': 'line',
  'paint': {
    'line-opacity': 0.7,
    'line-color': 'red',
    'line-width': 3,
  },
  BEFORE: 'LABEL',
})

registerGroup('ekofolio', [
  'ekofolio-areas-sym',
  'ekofolio-areas-boundary',
])
