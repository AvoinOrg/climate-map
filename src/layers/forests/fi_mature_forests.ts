import { addSource, addLayer } from '../../layer_groups'
import { setupPopupHandlerForMetsaanFiStandData, metsaanFiTreeSpecies } from './fi_forest_common'
import { Expression } from 'mapbox-gl';

const fillRegenerationFelling: Expression = [
    'case', ['>=', 0.5, ['get', 'regeneration_felling_prediction']],
    'rgba(73, 25, 2320, 0.65)',
    'rgba(206, 244, 66, 0.35)',
];

addLayer({
    'id': 'metsaan-stand-mature-fill',
    'source': 'metsaan-stand',
    'source-layer': 'stand',
    'type': 'fill',
    minzoom: 12,
    'paint': {
        // 'fill-color': fillColorFertilityClass,
        'fill-color': fillRegenerationFelling,
        // 'fill-opacity': fillOpacity, // Set by fill-color rgba
    },
    BEFORE: 'FILL',
})
const treeSpeciesText = speciesId => [
    "match", speciesId,
    ...(Object.entries(metsaanFiTreeSpecies).reduce((x, y) => [...x, +y[0], y[1]], [])),
    "Unknown",
]
addLayer({
    'id': 'metsaan-stand-mature-sym',
    'source': 'metsaan-stand',
    'source-layer': 'stand',
    'type': 'symbol',
    "minzoom": 15.5,
    // 'maxzoom': zoomThreshold,
    "paint": {},
    "layout": {
        "text-size": 20,
        "symbol-placement": "point",
        "text-font": ["Open Sans Regular"],
        "text-field": [
            "concat",
            "Main species: ", treeSpeciesText(["get", "maintreespecies"]),
            "\navg.age: ", ["get", "meanage"],
            "\navg.diameter: ", ["get", "meandiameter"], " cm",
        ],
    },
    BEFORE: 'LABEL',
})

addSource('metsaan-stand-mature-raster', {
    "type": 'raster',
    'tiles': ['https://map.buttonprogram.org/stand2-mature/{z}/{x}/{y}.png'],
    'tileSize': 512,
    "maxzoom": 12,
    bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
});

addLayer({
    'id': 'metsaan-stand-mature-raster',
    'source': 'metsaan-stand-mature-raster',
    'type': 'raster',
    'minzoom': 0,
    'maxzoom': 12,
    BEFORE: 'FILL',
})

setupPopupHandlerForMetsaanFiStandData('metsaan-stand-mature-fill');
