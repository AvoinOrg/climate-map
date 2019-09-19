import { addSource, addLayer } from '../../layer_groups'
import { roundToSignificantDigits, fillOpacity } from '../../utils'
import { fieldColorDefault, fieldColorHistosol } from './common'
import { Expression } from 'mapbox-gl';

const isHistosol = ["==", ['get', 'wrbgrupper'], 'HS'];
// Unit: tons of CO2e per hectare per annum.
const fieldPlotCO2ePerHectare = ["case", isHistosol, 20, 2.2];
const histosolCalc = roundToSignificantDigits(2, ['*', 20 * 1e-4, ['get', 'st_area']]);
const nonHistosolCalc = roundToSignificantDigits(2, ['*', 2.2 * 1e-4, ['get', 'st_area']]);

const fieldPlotTextField: Expression = [
    "step", ["zoom"],

    // 0 <= zoom < 15.5:
    [
        "case", isHistosol, [
            "concat", histosolCalc, " t/y",
        ], [ // else: non-histosol (histosol_area < 50%)
            "concat", nonHistosolCalc, " t/y",
        ],
    ],

    // zoom >= 15.5:
    15.5,
    [
        "case", isHistosol, [
            "concat",
            histosolCalc,
            "t CO2e/y",
            '\nsoil: histosol',
            // "\npeat:", ["/", ["round", ['*', 0.001, ['to-number', ["get", "histosol_area"], 0]]], 10], 'ha',
            "\narea: ", ["/", ["round", ['*', 1e-3, ["get", "st_area"]]], 10], "ha",
        ], [ // else: non-histosol (histosol_area < 50%)
            "concat",
            nonHistosolCalc,
            "t CO2e/y",
            '\nsoil: mineral',
            "\narea: ", ["/", ["round", ['*', 1e-3, ["get", "st_area"]]], 10], "ha",
        ],
    ],
];

addSource('nibio-soils', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/nibio-jordsmonn/{z}/{x}/{y}.pbf.gz?v=1"],
    "minzoom": 0,
    "maxzoom": 12,
    // bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="https://nibio.no/">© NIBIO</a>',
});
addLayer({
    'id': 'nibio-soils-fill',
    'source': 'nibio-soils',
    'source-layer': 'default',
    'type': 'fill',
    'paint': {
        'fill-color': ['case', isHistosol, fieldColorHistosol, fieldColorDefault],
        // 'fill-color': fieldAreaCO2eFillColor(fieldPlotCO2ePerHectare),
        // 'fill-color': 'yellow',
        // 'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'nibio-soils-outline',
    'source': 'nibio-soils',
    'source-layer': 'default',
    'type': 'line',
    "minzoom": 9,
    'paint': {
        'line-opacity': 0.5,
    },
    BEFORE: 'OUTLINE',
})
addLayer({
    'id': 'nibio-soils-sym',
    'source': 'nibio-soils',
    'source-layer': 'default',
    'type': 'symbol',
    "minzoom": 14,
    "paint": {},
    "layout": {
        "text-size": 20,
        "symbol-placement": "point",
        "text-font": ["Open Sans Regular"],
        "text-field": fieldPlotTextField, // wrbCodeToLabel(["get", "wrbgrupper"]),
        //     'case', ['==', ['get', 'pintamaalaji'], ['get', 'pohjamaalaji']],
        //     ['get', 'pintamaalaji'],
        //     [
        //         'concat',
        //         'topsoil: ', ['get', 'pintamaalaji'],
        //         '\nsubsoil: ', ['get', 'pohjamaalaji'],
        //     ],
        // ],
    },
    BEFORE: 'LABEL',
})
