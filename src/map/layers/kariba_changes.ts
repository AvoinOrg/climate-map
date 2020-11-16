import { addLayer, addSource } from 'src/map/map';
import { registerGroup } from 'src/map/layer_groups';

const URL_PREFIX = `https://map.buttonprogram.org/kariba_changes`


addSource('kariba-changes', {
  "type": 'geojson',
  'data': `${URL_PREFIX}/kariba_changes_2019-2020.geojson?v=1`,
});


addLayer({
  'id': `kariba-changes-boundary`,
  'source': 'kariba-changes',
  'type': 'line',
  'paint': {
    'line-opacity': 0.5,
    'line-width': 10,
    'line-color': '#f00',
  },
  BEFORE: 'OUTLINE',
});


for (const year of [2019, 2020]) {
  addLayer({
    'id': `kariba_${year}`,
    'type': 'raster',
    'source': {
      'type': 'raster',
      'tiles': [
        `${URL_PREFIX}/${year}/{z}/{x}/{y}.jpg?v=01debug`,
      ],
      'tileSize': 512,
      minzoom: 13,
      maxzoom: 13,
    },
    'paint': {},
    BEFORE: 'FILL',
  })
}

registerGroup('kariba_changes_2019', [
  'kariba-changes-boundary',
  'kariba_2019',
])
registerGroup('kariba_changes_2020', [
  'kariba-changes-boundary',
  'kariba_2020',
])
