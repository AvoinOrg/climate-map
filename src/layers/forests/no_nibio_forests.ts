import { addSource, addLayer } from '../../layer_groups'
import { roundToSignificantDigits, fillOpacity } from '../../utils'
import { fieldColorDefault, fieldColorHistosol } from '../fields/common'

// https://www.nibio.no/tjenester/nedlasting-av-kartdata/dokumentasjon/jordsmonn/_/attachment/inline/f67020d0-cf9f-4085-aaaa-3b1a231826cc:5d04023805e4bf08580857f779517265ad4fdc19/Dokumentasjon%20jordsmonn%2020160525.pdf

// Soil granularity? Something like that
const nibioSoilTexture = v => [
    "match", v,
    1, "Sand",

    2, "Silty sand", // <10% clay, 40..85% sand, <50% silt
    3, "Silt", // <12% clay, >50% silt
    4, "Moderate clay silt", // 10..25% clay, 25..50% silt

    // [25..40% clay, 25..50% silt] or
    // or 40..60% clay and <=50% silt
    // or >60% clay
    5, "Medium-high clay content",

    6, "Organic", // >=20% organic material,
    0, "Unclassified",
    9, "Unclassified",
];

// WRB codes from NIBIO data:
const wrbCodeToLabel = v => [
    "match", v,
    "FL", "Fluvisol",
    "CM", "Cambisol",
    "PH", "Phaeozem",
    "UM", "Umbrisol",
    "HS", "Histosol",
    "AB", "Albeluvisol",
    "GL", "Gleysol",
    "ST", "Stagnosol",
    "PL", "Planosol",
    "RG", "Regosol",
    "AR", "Arenosol",
    "PZ", "Podzol",
    "LP", "Leptosol",
    "AT", "Anthrosol",
    "RGah", "Fill soil", // I think? Original NIBIO: "Planeringer/Fyllinger"
    "TC", "Technosol",
    "",
];

addSource('nibio-ar50', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/nibio-ar50/{z}/{x}/{y}.pbf.gz?v=1"],
    "minzoom": 0,
    "maxzoom": 12,
    // bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="https://nibio.no/">© NIBIO</a>',
});
addLayer({
    'id': 'nibio-ar50-fill',
    'source': 'nibio-ar50',
    'source-layer': 'default',
    'type': 'fill',
    'paint': {
        'fill-color': 'rgba(200,0,0,0.5)',
        'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'nibio-ar50-outline',
    'source': 'nibio-ar50',
    'source-layer': 'default',
    'type': 'line',
    "minzoom": 9,
    'paint': {
        'line-opacity': 0.5,
    },
    BEFORE: 'OUTLINE',
})
addLayer({
    'id': 'nibio-ar50-sym',
    'source': 'nibio-ar50',
    'source-layer': 'default',
    'type': 'symbol',
    "minzoom": 14,
    "paint": {},
    "layout": {
        "text-size": 20,
        "symbol-placement": "point",
        "text-font": ["Open Sans Regular"],
        "text-field": '',
    },
    BEFORE: 'LABEL',
})

// AR50: arealtype (ARTYPE)
// Class	Description
// 10	Built: residential, urban, urban, transport, industrial, etc.
// 20	Agriculture: Full-grown soil, surface cultivation soil and inland pasture
// 30	Forest: Forest-covered area
// 50	Snaemark(?): with natural vegetation cover that is not forest
// 60	?: Area that on the surface has the mark of marsh
// 70	?: Ice and snow that do not melt during the summer
// 81	Fresh water: River and lake
// 82	Ocean
// 99	Not mapped
addLayer({
    'id': 'nibio-ar50-forests-fill',
    'source': 'nibio-ar50',
    'source-layer': 'default',
    filter: ['==', ['get', 'arealtype'], 30],
    'type': 'fill',
    'paint': {
        'fill-color': 'rgba(200,2000,0,0.5)',
        'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'nibio-ar50-forests-outline',
    'source': 'nibio-ar50',
    'source-layer': 'default',
    filter: ['==', ['get', 'arealtype'], 30],
    'type': 'line',
    "minzoom": 9,
    'paint': {
        'line-opacity': 0.5,
    },
    BEFORE: 'OUTLINE',
})
addLayer({
    'id': 'nibio-ar50-forests-sym',
    'source': 'nibio-ar50',
    'source-layer': 'default',
    filter: ['==', ['get', 'arealtype'], 30],
    'type': 'symbol',
    "minzoom": 14,
    "paint": {},
    "layout": {
        "text-size": 20,
        "symbol-placement": "point",
        "text-font": ["Open Sans Regular"],
        "text-field": '',
    },
    BEFORE: 'LABEL',
})
