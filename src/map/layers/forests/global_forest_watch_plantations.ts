import { fillOpacity, pp } from '../../utils'
import { addSource, addLayer, genericPopupHandler, createPopup } from '../../map';
import { registerGroup } from 'src/map/layer_groups';

addSource('gfw_tree_plantations', {
  "type": "vector",
  "tiles": ["https://server.avoin.org/data/map/gfw_tree_plantations/{z}/{x}/{y}.pbf"],
  "minzoom": 0,
  "maxzoom": 12,
  attribution: '<a href="https://www.globalforestwatch.org/">© Global Forest Watch</a>',
});
addLayer({
  'id': 'gfw_tree_plantations-fill',
  'source': 'gfw_tree_plantations',
  'source-layer': 'gfw_plantations',
  'type': 'fill',
  'paint': {
    'fill-color': [
      'case', ['<', 0.4, ['get', 'peat_ratio']],
      'rgb(214, 7, 7)',
      'rgb(109, 41, 7)',
    ],
    'fill-opacity': fillOpacity,
  },
  BEFORE: 'FILL',
})
addLayer({
  'id': 'gfw_tree_plantations-outline',
  'source': 'gfw_tree_plantations',
  'source-layer': 'gfw_plantations',
  'type': 'line',
  "minzoom": 9,
  'paint': {
    'line-opacity': 0.5,
  },
  BEFORE: 'OUTLINE',
})
addLayer({
  'id': 'gfw_tree_plantations-sym',
  'source': 'gfw_tree_plantations',
  'source-layer': 'gfw_plantations',
  'type': 'symbol',
  "minzoom": 14,
  "paint": {},
  "layout": {
    "text-size": 20,
    "symbol-placement": "point",
    "text-font": ["Open Sans Regular"],
    "text-field": ['get', 'spec3'],
  },
  BEFORE: 'LABEL',
})

genericPopupHandler('gfw_tree_plantations-fill', e => {
  const f = e.features[0];
  const { image, spec_simp, type_text, area_ha, peat_ratio, avg_peatdepth } = f.properties;

  const images: string[] = image.replace(/\.(tif|img|_)/g, '').toUpperCase().split(/[,; ]+/);
  let results = '';
  for (const x of images) {
    if (!/LGN\d/.test(x)) { continue; }
    const base = x.replace(/LGN.*/, 'LGN0');
    // Most of the source images seem to fall in these categories.

    // Candidate URLs:
    for (const z of [0, 1, 2])
      results += `\n<li><a target="_blank" href="https://earthexplorer.usgs.gov/metadata/12864/${base + z}/">${base + x}</a></li>`;
  }

  const peatInfo = peat_ratio < 0.4 ? '' : `<strong>Tropical peatland</strong><br/>\nAverage peat depth: ${avg_peatdepth.toFixed(1)} metres<br/>`;

  const co2eStr = peat_ratio < 0.4 ? '' : `Emission reduction potential when ground water level is raised by 40 cm: <strong>${pp(19.4 * area_ha)}</strong> tons CO2e/year<br/>`;

  let html = `
        <strong>Tree plantation (Global Forest Watch)</strong><br/>
        ${spec_simp}
        <br/>
        ${type_text}
        <br/>
        ${peatInfo}
        Area:${pp(area_ha, 3)} hectares
        <br/>
        ${co2eStr}
        Landsat source ID: <code>${image}</code>
        <br/>
    `
  if (results) html += `Potential Landsat source images: <ul>${results}</ul>`;

  createPopup(e, html, { maxWidth: '360px' });
});

registerGroup('gfw_tree_plantations', [
  'gfw_tree_plantations-fill',
  'gfw_tree_plantations-outline',
  'gfw_tree_plantations-sym',
])
