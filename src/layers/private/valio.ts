import { addSource, addLayer } from '../../layer_groups'
import { fieldPlotTextField, fieldColorHistosol, fieldColorDefault, fieldPlotHistosolRatio, setupPopupHandlerForMaviPeltolohko } from '../fields/common';
import { addDataset } from './common';

const addFn = (secret: string) => {
    addSource('valio_fields', {
        "type": "vector",
        "tiles": [`https://map.buttonprogram.org/private/${secret}/valio_fields/{z}/{x}/{y}.pbf?v=3`],
        bounds: [19, 59, 32, 71], // Finland
        "maxzoom": 11,
    });

    addLayer({
        'id': 'valio-fields-fill',
        'source': 'valio_fields',
        'source-layer': 'valio_fields',
        'type': 'fill',
        'paint': {
            'fill-color': ["case", [">=", fieldPlotHistosolRatio, 0.4], fieldColorHistosol, fieldColorDefault],
            // 'fill-color': fieldAreaCO2eFillColor(fieldPlotCO2ePerHectare),
            // 'fill-opacity': fillOpacity, // Set by fill-color rgba
        },
        BEFORE: 'FILL',
    })
    addLayer({
        'id': 'valio-fields-boundary',
        'source': 'valio_fields',
        'source-layer': 'valio_fields',
        'type': 'line',
        'paint': {
            'line-opacity': 0.75,
        },
        "minzoom": 11,
        BEFORE: 'OUTLINE',
    })

    addLayer({
        'id': 'valio-plohko-co2',
        'source': 'valio_fields',
        'source-layer': 'valio_fields',
        // 'source-layer': 'suopellot',
        'type': 'symbol',
        "minzoom": 14.5,
        // 'maxzoom': zoomThreshold,
        "paint": {},
        "layout": {
            "symbol-placement": "point",
            "text-font": ["Open Sans Regular"],
            "text-size": 20,
            // NB: 400t CO2eq/ha/20yrs -> 2kg/m2/y
            // round(0.0002*total_area) -> reduce precision -> *10 -> 2kg/m2
            "text-field": fieldPlotTextField,
        },
        BEFORE: 'LABEL',
    })

    setupPopupHandlerForMaviPeltolohko('Field plot (Valio)', 'valio-fields-fill');
};

addDataset('valio', addFn);
