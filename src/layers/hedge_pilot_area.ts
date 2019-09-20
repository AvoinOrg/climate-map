import { addSource, addLayer } from '../layer_groups'

addSource('hedge-pilot-area', {
    "type": 'raster',
    "tiles": ["https://map.buttonprogram.org/hedge-pilot-area/{z}/{x}/{y}.png"],
    "minzoom": 11,
    "maxzoom": 16,
});
addLayer({
    'id': 'hedge-pilot-area-raster',
    'source': 'hedge-pilot-area',
    'type': 'raster',
    paint: {
        'raster-opacity': 0.7,
    },
    BEFORE: 'FILL',
})
