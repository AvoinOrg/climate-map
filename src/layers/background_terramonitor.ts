import { addLayer } from '../layer_groups';

addLayer({
    'id': 'terramonitor',
    'type': 'raster',
    'source': {
        'type': 'raster',
        'tiles': [
            `https://tm2.terramonitor.com/${process.env.TERRAMONITOR_KEY}/rgb/{z}/{x}/{y}.png`,
        ],
        'tileSize': 256,
        // "maxzoom": 16, // After zoom level 16 the images (used to) get blurrier
        attribution: '<a href="https://www.terramonitor.com">© Terramonitor</a>',
    },
    'paint': {},
    BEFORE: 'BACKGROUND',
});
