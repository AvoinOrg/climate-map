import { addSource, addLayer } from '../map'
import { registerGroup } from '../layer_groups';

addSource('hedge-pilot-area', {
    "type": 'raster',
    "tiles": ["https://server.avoin.org/data/map/hedge-pilot-area/{z}/{x}/{y}.png"],
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

registerGroup('hedge-pilot-area', ['hedge-pilot-area-raster'])
