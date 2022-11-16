import { addSource, addLayer } from '../map'
import { fillOpacity } from '../utils'
import { registerGroup } from '../layer_groups';

const snowCoverLossDays = ['-', ["get", "avg_snow_cover_1980_1990"], ["get", "avg_snow_cover_1996_2016"]];
addSource('snow_cover_loss', {
  "type": "vector",
  "tiles": ["https://server.avoin.org/data/map/snow_cover_loss_2016/{z}/{x}/{y}.pbf"],
  "maxzoom": 3,
});
addLayer({
  'id': 'snow_cover_loss-fill',
  'source': 'snow_cover_loss',
  'source-layer': 'snow_cover_loss_1980_through_2016',
  'type': 'fill',
  'paint': {
    'fill-color': [
      'interpolate',
      ['linear'],
      snowCoverLossDays,
      0, 'rgb(255,255,255)',
      8, 'rgb(128,128,128)',
      15, 'rgb(252,113,34)', // orange
      21, 'rgb(245,17,72)', // red
    ],
    'fill-opacity': fillOpacity,
  },
  BEFORE: 'FILL',
})
addLayer({
  'id': 'snow_cover_loss-sym',
  'source': 'snow_cover_loss',
  'source-layer': 'snow_cover_loss_1980_through_2016',
  'type': 'symbol',
  "minzoom": 10,
  "paint": {},
  "layout": {
    "text-size": 20,
    "symbol-placement": "point",
    "text-font": ["Open Sans Regular"],
    "text-field": [
      "concat",
      // "Snow cover lost per year: ", snowCoverLossDays,
      // "\n",
      "Days with snow (1980..1990): ", ["get", "avg_snow_cover_1980_1990"],
      "\n",
      "Days with snow (1996..2016): ", ["get", "avg_snow_cover_1996_2016"],
    ],
  },
  BEFORE: 'LABEL',
})

registerGroup('snow_cover_loss', ['snow_cover_loss-fill', 'snow_cover_loss-sym'])
