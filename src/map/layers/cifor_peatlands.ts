import { addSource, addLayer } from '../map'
import { registerGroup } from '../layer_groups';

addSource('cifor-peatdepth', {
    "type": 'raster',
    "tiles": ["https://map.buttonprogram.org/cifor/TROP-SUBTROP_PeatDepthV2_2016_CIFOR/{z}/{x}/{y}.png?v=3"],
    bounds: [-180, -60, 180, 40],
    "minzoom": 0,
    "maxzoom": 10,
    attribution: '<a href="https://www.cifor.org/">© Center for International Forestry Research (CIFOR)</a>',
});
addSource('cifor-wetlands', {
    "type": 'raster',
    "tiles": ["https://map.buttonprogram.org/cifor/TROP-SUBTROP_WetlandV2_2016_CIFOR/{z}/{x}/{y}.png?v=3"],
    bounds: [-180, -60, 180, 40],
    "minzoom": 0,
    "maxzoom": 10,
    attribution: '<a href="https://www.cifor.org/">© Center for International Forestry Research (CIFOR)</a>',
});
addLayer({
    'id': 'cifor-peatdepth-raster',
    'source': 'cifor-peatdepth',
    'type': 'raster',
    paint: {
        'raster-opacity': 0.7,
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'cifor-wetlands-raster',
    'source': 'cifor-wetlands',
    'type': 'raster',
    paint: {
        'raster-opacity': 0.7,
    },
    BEFORE: 'FILL',
})

registerGroup('cifor-peatdepth', ['cifor-peatdepth-raster'])
registerGroup('cifor-wetlands', ['cifor-wetlands-raster'])
