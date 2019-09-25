import { addSource, addLayer } from '../layer_groups'
import { fillOpacity, roundToSignificantDigits, genericPopupHandler, createPopup } from '../utils'

addSource('helsinki-buildings', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/helsinki-buildings/{z}/{x}/{y}.pbf"],
    "maxzoom": 14,
    // Bounds source: https://koordinates.com/layer/4257-finland-11000000-administrative-regions/
    // select ST_Extent(ST_Transform(ST_SetSRID(geom,3067), 4326))
    // from "finland-11000000-administrative-regions" where kunta_ni1='Helsinki';
    bounds: [24, 59, 26, 61],
    attribution: '<a href="https://www.hel.fi">© City of Helsinki</a>',
});
addLayer({
    'id': 'helsinki-buildings-fill',
    'source': 'helsinki-buildings',
    'source-layer': 'Rakennukset_alue',
    'type': 'fill',
    'paint': {
        'fill-color': 'cyan',
        'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'helsinki-buildings-outline',
    'source': 'helsinki-buildings',
    'source-layer': 'Rakennukset_alue',
    'type': 'line',
    "minzoom": 11,
    'paint': {
        'line-opacity': 0.75,
    },
    BEFORE: 'OUTLINE',
})

// (60 kWh/m3)  * (0.250 CO2e kg/kWh) -> 15kg/m3
addLayer({
    'id': 'helsinki-buildings-co2',
    'source': 'helsinki-buildings',
    'source-layer': 'Rakennukset_alue',
    'type': 'symbol',
    "minzoom": 16,
    'paint': {},
    "layout": {
        "symbol-placement": "point",
        "text-font": ["Open Sans Regular"],
        "text-size": 20,
        "text-field": [
            "case", ["has", "i_raktilav"], [
                'let',
                "co2", ['/', ['*', 15, ['to-number', ["get", "i_raktilav"], 0]], 1000],
                [
                    'concat',
                    roundToSignificantDigits(2, ['var', 'co2']), // kg -> tons
                    ' t CO2e/y',
                ],
            ], "",
        ],
    },
    BEFORE: 'LABEL',
})

addSource('helsinki-puretut', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/hel-puretut/{z}/{x}/{y}.pbf.gz?v=0"],
    "maxzoom": 14,
    // Bounds source: https://koordinates.com/layer/4257-finland-11000000-administrative-regions/
    // select ST_Extent(ST_Transform(ST_SetSRID(geom,3067), 4326))
    // from "finland-11000000-administrative-regions" where kunta_ni1='Helsinki';
    bounds: [24, 59, 26, 61],
    attribution: '<a href="https://www.hel.fi">© City of Helsinki</a>',
});
addLayer({
    'id': 'helsinki-puretut-fill',
    'source': 'helsinki-puretut',
    'source-layer': 'default',
    'type': 'fill',
    'paint': {
        'fill-color': 'red',
        'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'helsinki-puretut-outline',
    'source': 'helsinki-puretut',
    'source-layer': 'default',
    'type': 'line',
    "minzoom": 11,
    'paint': {
        'line-opacity': 0.75,
    },
    BEFORE: 'OUTLINE',
})

addLayer({
    'id': 'helsinki-puretut-sym',
    'source': 'helsinki-puretut',
    'source-layer': 'default',
    'type': 'symbol',
    "minzoom": 16,
    'paint': {},
    "layout": {
        "symbol-placement": "point",
        "text-font": ["Open Sans Regular"],
        "text-size": 20,
        "text-field": "",
    },
    BEFORE: 'LABEL',
})
genericPopupHandler('helsinki-puretut-fill', e => {
    const htmlParts = [];
    const buildingIdMap = {};
    e.features.forEach(f => {
        const p = f.properties;
        const buildingIdText = p.vtj_prt && p.ratu
            ? `${p.vtj_prt} (${p.ratu})`
            : p.vtj_prt || p.ratu;
        const s = `
        <p>
        XXX_BUILDING_ID_TEMPLATE_XXX
        <address>
        ${p.osoite}<br/>
        ${p.postinumero}
        </address>
        <strong>Demolition requested by:</strong> <address>
        ${p.hakija}<br/>
        ${p.hakija_osoite}<br/>
        ${p.hakija_postinumero}<br/>
        </address>
        <strong>Demolition permit valid until:</strong> ${p.lupa_voimassa_asti}
        </p>
        `;
        // Deduplicate info texts:
        if (htmlParts.indexOf(s) === -1) {
            htmlParts.push(s);
        }
        buildingIdMap[s] = buildingIdMap[s] || [];
        if (buildingIdText) buildingIdMap[s].push(buildingIdText);
    })

    const html = htmlParts.reduce((a, b) => a + b.replace(
        'XXX_BUILDING_ID_TEMPLATE_XXX',
        buildingIdMap[b]
            ? buildingIdMap[b].reduce((c: string, d: string) =>
                c ? `${c}, ${d}`
                    : `<strong>Building ID:</strong> ${d}`, '')
            : ''
    ), '')

    createPopup(e, html, { maxWidth: '360px' });
});
