import { addSource, addLayer, genericPopupHandler, createPopup } from '../map'
import { fillOpacity, pp } from '../utils'
import { registerGroup } from '../layer_groups';

addSource('hel-energiatodistukset', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/hel-energiatodistukset/{z}/{x}/{y}.pbf?v=3"],
    "maxzoom": 14,
    // Bounds source: https://koordinates.com/layer/4257-finland-11000000-administrative-regions/
    // select ST_Extent(ST_Transform(ST_SetSRID(geom,3067), 4326))
    // from "finland-11000000-administrative-regions" where kunta_ni1='Helsinki';
    bounds: [24, 59, 26, 61],
    attribution: '<a href="https://www.hel.fi">© City of Helsinki</a>',
});
addLayer({
    'id': 'hel-energiatodistukset-fill',
    'source': 'hel-energiatodistukset',
    'source-layer': 'energiatodistukset',
    'type': 'fill',
    'paint': {
        'fill-color': [
            'match', ['get', 'e_luokka'],
            'A', '#1F964A',
            'B', '#7DAD46',
            'C', '#CCD040',
            'D', '#FFEA43',
            'E', '#ECB234',
            'F', '#D2621F',
            'G', '#C70016',
            'white',
        ],
        'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'hel-energiatodistukset-outline',
    'source': 'hel-energiatodistukset',
    'source-layer': 'energiatodistukset',
    'type': 'line',
    "minzoom": 11,
    'paint': {
        'line-opacity': 0.75,
    },
    BEFORE: 'OUTLINE',
})

addLayer({
    'id': 'hel-energiatodistukset-sym',
    'source': 'hel-energiatodistukset',
    'source-layer': 'energiatodistukset',
    'type': 'symbol',
    "minzoom": 14,
    'paint': {},
    "layout": {
        "symbol-placement": "point",
        "text-font": ["Open Sans Regular"],
        "text-size": 20,
        "text-field": [
            "case", ["has", "e_luokka"], ["get", "e_luokka"], ""
        ],
    },
    BEFORE: 'LABEL',
})

genericPopupHandler('hel-energiatodistukset-fill', ev => {
    let html = '';
    for (const f of ev.features) {
        const p = f.properties;

        const energyUse = p.e_luku * p.lämmitetty_nettoala
        const energyPerVolume = p.i_raktilav
            ? `<br/>Energy use per m³: ${pp(energyUse / p.i_raktilav)} kWh per year`
            : '';

        const url = `https://www.energiatodistusrekisteri.fi/public_html?energiatodistus-id=${p.todistustunnus}&command=access&t=energiatodistus&p=energiatodistukset`
        html += `
        <p>
        Certificate ID: <a href="${url}">${p.todistustunnus}</a><br/>
        Total energy consumption: ${pp(energyUse)} kWh per year<br/>
        Energy use per m²: ${p.e_luku} kWh per year
        ${energyPerVolume}
        </p>
        `
    }

    createPopup(ev, html);
});

registerGroup('building-energy-certificates', [
  'hel-energiatodistukset-fill',
  'hel-energiatodistukset-outline',
  'hel-energiatodistukset-sym'
])
