import { addSource, addLayer } from '../map'
import { roundToSignificantDigits, fillOpacity } from '../utils'

// https://www.hsy.fi/fi/asiantuntijalle/avoindata/Sivut/AvoinData.aspx?dataID=41
// https://www.hsy.fi/fi/asiantuntijalle/avoindata/lisenssi/Sivut/default.aspx
// CC 4.0 BY, ByAttribution
addSource('hsy-solar-potential', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/hsy-aurinkosahkopotentiaali/{z}/{x}/{y}.pbf"],
    "minzoom": 1,
    "maxzoom": 14,
    bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="https://www.hsy.fi/">© HSY</a>',
});

addLayer({
    'id': 'hsy-solar-potential-fill',
    'source': 'hsy-solar-potential',
    'source-layer': 'solarpower_potential',
    'type': 'fill',
    'paint': {
        'fill-color': [
            "case", ["has", "ELEC"], [
                "case", ["<", 0, ["get", "ELEC"]],
                '#92b565',
                'gray',
            ],
            'gray',
        ],
        // areaCO2eFillColor(['*', 1e-3, ['get', 'CO2']]), // The variable CO2 is not documented at all!
        'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'hsy-solar-potential-outline',
    'source': 'hsy-solar-potential',
    'source-layer': 'solarpower_potential',
    'type': 'line',
    "minzoom": 11,
    // 'maxzoom': zoomThreshold,
    'paint': {
        'line-opacity': 0.5,
    },
    BEFORE: 'OUTLINE',
})
addLayer({
    'id': 'hsy-solar-potential-sym',
    'source': 'hsy-solar-potential',
    'source-layer': 'solarpower_potential',
    'type': 'symbol',
    "minzoom": 17,
    // 'maxzoom': zoomThreshold,
    "paint": {},
    "layout": {
        "text-size": 20,
        "symbol-placement": "point",
        "text-font": ["Open Sans Regular"],
        "text-field": [
            "case", ["has", "ELEC"], [
                "case", ["<", 0, ["get", "ELEC"]], [
                    "concat",
                    // roundToSignificantDigits(2, ['*', 1e-3, ["get", "CO2"]]), // TODO: Get documentation for this!
                    // "t CO2e/y",
                    // "\nElectricity generation: ",
                    roundToSignificantDigits(2, ['*', 1e-3, ["get", "ELEC"]]),
                    " MWh/year"
                ],
                "",
            ],
            "",
        ],
    },
    BEFORE: 'LABEL',
})
