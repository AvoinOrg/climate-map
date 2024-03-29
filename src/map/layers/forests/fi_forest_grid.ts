import { addLayer, addSource } from '../../map';
import { fillOpacity } from '../../utils'
import { registerGroup } from 'src/map/layer_groups';

addSource('metsaan-hila', {
    "type": "vector",
    "tiles": ["https://server.avoin.org/data/map/metsaan-hila/{z}/{x}/{y}.pbf"],
    "maxzoom": 15,
    bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
});
addLayer({
    'id': 'metsaan-hila-c',
    'source': 'metsaan-hila',
    'source-layer': 'metsaan-hila',
    'type': 'fill',
    'paint': {
        'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'age'],
            0, 'rgb(218,248,85)', // green
            70, 'rgb(252,113,34)', // orange
            100, 'rgb(245,17,72)', // red
        ],
        'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'metsaan-hila-outline',
    'source': 'metsaan-hila',
    'source-layer': 'metsaan-hila',
    'type': 'line',
    "minzoom": 14,
    'paint': {
        'line-opacity': 0.75,
    },
    BEFORE: 'OUTLINE',
})
addLayer({
    'id': 'metsaan-hila-sym',
    'source': 'metsaan-hila',
    'source-layer': 'metsaan-hila',
    'type': 'symbol',
    "minzoom": 15,
    // 'maxzoom': zoomThreshold,
    "paint": {},
    "layout": {
        "symbol-placement": "point",
        "text-font": ["Open Sans Regular"],
        "text-field": 'Age:{age} Avg.Diameter:{meandiameter}',
        "text-size": 10,
    },
    BEFORE: 'LABEL',
})

registerGroup('forest-grid', ['metsaan-hila-c', 'metsaan-hila-sym', 'metsaan-hila-outline'])
