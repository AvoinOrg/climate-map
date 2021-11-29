import { fillOpacity, roundToSignificantDigits, pp } from '../utils'
import { genericPopupHandler, createPopup, addSource, addLayer } from '../map';
import { registerGroup } from '../layer_groups';

addSource('fi-buildings', {
    "type": "vector",
    "tiles": ["https://server.avoin.org/data/map/fi-buildings/{z}/{x}/{y}.pbf.gz"],
    "minzoom": 9,
    "maxzoom": 13,
    bounds: [19, 59, 32, 71], // Finland
});

addLayer({
    'id': 'fi-buildings-fill',
    'source': 'fi-buildings',
    'source-layer': 'default',
    'type': 'fill',
    'paint': {
        'fill-color': 'cyan',
        'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})

addLayer({
    'id': 'fi-buildings-outline',
    'source': 'fi-buildings',
    'source-layer': 'default',
    'type': 'line',
    'paint': {
        'line-opacity': 0.75,
    },
    BEFORE: 'OUTLINE',
})

interface IBuildingSchemaVRK {
    building_id: string;
    region : string;
    municipality : string;
    street : string;
    house_number : string;
    postal_code : string;
    building_use : number;
}
interface IBuildingSchemaNLS {
    gid              : number;
    sijaintitarkkuus : number;
    aineistolahde    : number;
    alkupvm          : string;
    kohderyhma       : number;
    kohdeluokka      : number;
    korkeustarkkuus  : number;
    kayttotarkoitus  : number;
    kerrosluku       : number;
    pohjankorkeus    : number;
    korkeusarvo      : number;

    st_area          : number;
}
interface IBuildingSchema {
    id: number;
    building_id: string;
    gid: number;
    distance_poly? : number;
    distance_centroid? : number;
}
// interface IBuildingSchemaAll extends IBuildingSchemaVRK, IBuildingSchemaNLS, IBuildingSchema {}

genericPopupHandler('fi-buildings-fill', e => {
    const f = e.features[0]
    if (!f) return

    let vrk='', nls=''
    const props = f.properties as IBuildingSchema;
    if (props.building_id) {
        const p = props as unknown as IBuildingSchemaVRK;
        vrk = `
        <address>${p.street} ${p.house_number}, ${p.postal_code}</address>
        Building ID: <strong>${p.building_id}</strong>
        `
    }
    if (props.gid) {
        const p = props as unknown as IBuildingSchemaNLS;
        const approxArea = 0.888 * p.st_area;
        const approxVolume = 3.5 * approxArea;

        const floorCountCodes = {
            0: 'Unspecified',
            1: '1 or 2 floors',
            2: '3 or more floors',
        }
        const floorCount = floorCountCodes[p.kerrosluku] || 'Unknown'

        nls = `
        <br/>Floor count: ${floorCount}
        ${approxArea > 1 && `<br/>Estimated floorage: ${pp(approxArea, 2)} m<sup>2</sup> per floor`}
        ${approxArea > 1 && approxVolume && `<br/>Estimated volume: ${pp(approxVolume, 2)} m<sup>3</sup> per floor`}
        `
    }
    const html = vrk + nls
    createPopup(e, html, { maxWidth: '360px' });
});



addSource('helsinki-buildings', {
    "type": "vector",
    "tiles": ["https://server.avoin.org/data/map/helsinki-buildings/{z}/{x}/{y}.pbf"],
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
    "tiles": ["https://server.avoin.org/data/map/hel-puretut/{z}/{x}/{y}.pbf.gz?v=0"],
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


registerGroup('fi-buildings', [
  'fi-buildings-fill', 'fi-buildings-outline',
])

registerGroup('helsinki-buildings', [
  'helsinki-buildings-fill', 'helsinki-buildings-outline', 'helsinki-buildings-co2',
  'helsinki-puretut-fill', 'helsinki-puretut-outline', 'helsinki-puretut-sym',
])

