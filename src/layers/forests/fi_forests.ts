import { addLayer, addSource } from '../../map';
import { Expression } from 'mapbox-gl';

addSource('metsaan-stand', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/stand2/{z}/{x}/{y}.pbf.gz?v=2"],
    "minzoom": 12,
    "maxzoom": 13,
    bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
});

// The original fill color. Consistent with the raster overview images at the moment.
const fillColorFertilityClass: Expression = [
    'interpolate',
    ['linear'],
    ['get', 'fertilityclass'],
    1, 'rgba(245,17,72,0.8)', // red
    4, 'rgba(252,113,34,0.8)', // orange
    // 8, 'rgba(218,248,85,0.8)',
    6, 'rgba(218,248,85,0.8)', // green
];
addLayer({
    'id': 'metsaan-stand-fill',
    'source': 'metsaan-stand',
    'source-layer': 'stand',
    'type': 'fill',
    'paint': {
        'fill-color': fillColorFertilityClass,
        // 'fill-opacity': fillOpacity, // Set by fill-color rgba
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'metsaan-stand-outline',
    'source': 'metsaan-stand',
    'source-layer': 'stand',
    'type': 'line',
    "minzoom": 11,
    // 'maxzoom': zoomThreshold,
    'paint': {
        'line-opacity': 0.5,
    },
    BEFORE: 'OUTLINE',
})
addLayer({
    'id': 'metsaan-stand-co2',
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
            "case", ["has", "co2"], [
                "case", ["<", ["to-number", ["get", "co2"], 0], 0.1], "", [
                    "concat",
                    ["get", "co2"],
                    "t CO2e/y",
                ],
            ], "",
        ],
    },
    BEFORE: 'LABEL',
})
