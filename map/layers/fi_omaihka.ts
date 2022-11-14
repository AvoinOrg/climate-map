import { addLayer, addSource } from 'src/map/map';
import { Expression } from 'mapbox-gl';
import { registerGroup } from 'src/map/layer_groups';


const fillColorSoil: (codeAttr: string) => Expression = codeAttr => [
  'match', ['get', codeAttr],

  // {"pintamaalaji_koodi":195111,"pintamaalaji":"Kalliomaa (Ka) RT"}
  195111, '#adaaaa',
  // {"pintamaalaji_koodi":195210,"pintamaalaji":"Sekalajitteinen maalaji, päälajitetta ei selvitetty (SY) RT"}
  195210, '#b0a978',
  // {"pintamaalaji_koodi":195310,"pintamaalaji":"Karkearakeinen maalaji, päälajitetta ei selvitetty (KY) RT"}
  195310, '#a39952',
  // {"pintamaalaji_koodi":195410,"pintamaalaji":"Hienojakoinen maalaji, päälajitetta ei selvitetty (HY) RT"}
  195410, '#d4be1e',
  // {"pintamaalaji_koodi":195413,"pintamaalaji":"Savi (Sa) RT"}
  195413, '#9c4699',
  // {"pintamaalaji_koodi":19551822,"pintamaalaji":"Soistuma (Tvs) RT"}
  19551822, '#397d69',
  // {"pintamaalaji_koodi":19551891,"pintamaalaji":"Ohut turvekerros (Tvo) RT"}
  19551891, '#a85858',
  // {"pintamaalaji_koodi":19551892,"pintamaalaji":"Paksu turvekerros (Tvp) RT"}
  19551892, '#960c0c',
  // {"pintamaalaji_koodi":195603,"pintamaalaji":"Vesi (Ve)"}
  195603, '#4c3cfa',

  'black', // fallback - should not happen.
]

interface IHashParams { secret: string }
const hashParams: IHashParams =
  window.location.search.replace(/^[#?]*/, '').split('&').reduce((prev, item) => (
    Object.assign({ [item.split('=')[0]]: item.split('=')[1] }, prev)
  ), {}) as IHashParams;

const URL_PREFIX = `https://server.avoin.org/data/map/private/${hashParams.secret}`

addSource('fi-omaihka-overlay', {
  "type": 'geojson',
  'data': `${URL_PREFIX}/omaihka_overlay.geojson?v=2`,
});

addSource('fi-omaihka-soils', {
  "type": 'geojson',
  'data': `${URL_PREFIX}/omaihka_soils.geojson?v=2`,
});

addSource('fi-omaihka-plots', {
  "type": 'geojson',
  'data': `${URL_PREFIX}/omaihka_plots.geojson?v=2`,
});

addLayer({
  'id': 'fi-omaihka-soil-topsoil-fill',
  'source': 'fi-omaihka-soils',
  'type': 'fill',
  'paint': {
    'fill-color': fillColorSoil('pintamaalaji_koodi'),
  },
  BEFORE: 'FILL',
})
addLayer({
  'id': 'fi-omaihka-soil-subsoil-fill',
  'source': 'fi-omaihka-soils',
  'type': 'fill',
  'paint': {
    'fill-color': fillColorSoil('pohjamaalaji_koodi'),
  },
  BEFORE: 'FILL',
})


addLayer({
  'id': `fi-omaihka-soil-boundary`,
  'source': 'fi-omaihka-soils',
  'type': 'line',
  'paint': {
    'line-opacity': 0.5,
    'line-width': 2,
  },
  BEFORE: 'OUTLINE',
});

addLayer({
  'id': `fi-omaihka-plot-boundary`,
  'source': 'fi-omaihka-plots',
  'type': 'line',
  'paint': {
    'line-opacity': 1,
    'line-width': 4,
  },
  BEFORE: 'OUTLINE',
});


addLayer({
  'id': `fi-omaihka-sym`,
  'source': 'fi-omaihka-plots',
  'type': 'symbol',
  "layout": {
    "text-font": ["Open Sans Regular"],
    "text-field": [
      "case",
      ["has", "lohko_nimi"], ["coalesce", ["get", "lohko_nimi"], ""],
      ""
    ],
  },
  paint: {
    'text-color': "#999",
    'text-halo-blur': 1,
    'text-halo-color': "rgb(242,243,240)",
    'text-halo-width': 2,
  },
  BEFORE: 'LABEL',
})


addLayer({
  'id': `fi-omaihka-circle-locator-text`,
  'source': 'fi-omaihka-overlay',
  'type': 'symbol',
  'maxzoom': 14,
  "layout": {
    "text-font": ["Open Sans Regular"],
    "text-size": 30,
    "text-field": ['concat', 'Tila ', ["get", "tila_nro"]],
  },
  BEFORE: 'TOP',
})
addLayer({
  'id': `fi-omaihka-circle-locator`,
  'source': 'fi-omaihka-overlay',
  'type': 'circle',
  'maxzoom': 11,
  "paint": {
    'circle-color': 'red',
    'circle-radius': {
      'base': 20,
      'stops': [
        [0, 50],
        [10, 100]
      ]
    },
  },
  BEFORE: 'BG_LABEL',
})



// genericPopupHandler(['fi-omaihka-soil-topsoil-fill', 'fi-omaihka-soil-subsoil-fill'], e => {
//   const f = e.features[0];
//   const p = f.properties;


//   let html = '<table>'
//   for (const [k, v] of Object.entries(p)) {
//     html += `<tr><th>${sanitize(k.replace('__ext_', ''))}</th><td>${sanitize(v)}</td></tr>`
//   }
//   html += '</table>'

//   createPopup(e, html, { maxWidth: '480px' });
// });


addLayer({
  'id': `fi-omaihka-soils-highlighted`,
  "source": 'fi-omaihka-soils',
  "type": 'fill',
  "paint": {
    "fill-outline-color": "#484896",
    "fill-color": "#6e599f",
    "fill-opacity": 0.4
  },
  "filter": ["in", 'lohko'],
  BEFORE: 'OUTLINE',
});


registerGroup('fi-omaihka-topsoil', [
  'fi-omaihka-soil-topsoil-fill',
  'fi-omaihka-circle-locator',
  'fi-omaihka-circle-locator-text',
  'fi-omaihka-sym',
  'fi-omaihka-soils-highlighted',
  'fi-omaihka-plot-boundary', 'fi-omaihka-soil-boundary',
])
registerGroup('fi-omaihka-subsoil', [
  'fi-omaihka-soil-subsoil-fill',
  'fi-omaihka-circle-locator',
  'fi-omaihka-circle-locator-text',
  'fi-omaihka-sym',
  'fi-omaihka-soils-highlighted',
  'fi-omaihka-plot-boundary', 'fi-omaihka-soil-boundary',
])
