import { addSource, addLayer } from '../layer_groups'
import { fillOpacity } from '../utils'

addSource('gtk-mp20k-maalajit', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/mp20k_maalajit/{z}/{x}/{y}.pbf?v=2"],
    "minzoom": 0,
    "maxzoom": 12,
    bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="http://www.gtk.fi/">© Geological Survey of Finland</a>',
});
addLayer({
    'id': 'gtk-mp20k-maalajit-fill',
    'source': 'gtk-mp20k-maalajit',
    'source-layer': 'mp20k_maalajit',
    'type': 'fill',
    'paint': {
        'fill-color': 'rgb(188, 167, 177)',
        'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'gtk-mp20k-maalajit-outline',
    'source': 'gtk-mp20k-maalajit',
    'source-layer': 'mp20k_maalajit',
    'type': 'line',
    "minzoom": 9,
    'paint': {
        'line-opacity': 0.5,
    },
    BEFORE: 'OUTLINE',
})
addLayer({
    'id': 'gtk-mp20k-maalajit-sym',
    'source': 'gtk-mp20k-maalajit',
    'source-layer': 'mp20k_maalajit',
    'type': 'symbol',
    "minzoom": 14,
    "paint": {},
    "layout": {
        "text-size": 20,
        "symbol-placement": "point",
        "text-font": ["Open Sans Regular"],
        "text-field": [
            'case', ['==', ['get', 'pintamaalaji'], ['get', 'pohjamaalaji']],
            ['get', 'pintamaalaji'],
            [
                'concat',
                'topsoil: ', ['get', 'pintamaalaji'],
                '\nsubsoil: ', ['get', 'pohjamaalaji'],
            ],
        ],
    },
    BEFORE: 'LABEL',
})
