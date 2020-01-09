import { fillOpacity } from '../utils'
import { addSource, addLayer } from '../map';
import { Expression } from 'mapbox-gl';

addSource('fi-fish-pikeperch', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/fi-fish-pikeperch/{z}/{x}/{y}.pbf.gz"],
    // "minzoom": 9,
    "maxzoom": 13,
    bounds: [19, 59, 32, 71], // Finland
});


const fillColorExpr: (expr: Expression) => Expression = expr => [
    'interpolate',
    ['linear'],
    expr,
    0, '#EEFEFF',
    1, '#D0FBFE',
    2, '#B2F7FD',
    3, '#79ECF9',
    5, '#22C6E9',
    8, '#006BB8',
    10, '#003487',
];


addLayer({
    'id': 'fi-fish-pikeperch-fill',
    'source': 'fi-fish-pikeperch',
    'source-layer': 'default',
    'type': 'fill',
    'filter': ['has', 'pred_bpue'],
    'paint': {
        'fill-color': fillColorExpr(['get', 'pred_bpue']),
        'fill-opacity': ['case', ['has', 'pred_bpue'], fillOpacity, 0.1],
    },
    BEFORE: 'FILL',
})

addLayer({
    'id': 'fi-fish-pikeperch-outline',
    'source': 'fi-fish-pikeperch',
    'source-layer': 'default',
    'type': 'line',
    'paint': {
        'line-opacity': 0.75,
    },
    BEFORE: 'OUTLINE',
})
