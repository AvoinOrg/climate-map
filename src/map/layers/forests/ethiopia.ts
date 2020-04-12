import { addLayer, addSource } from '../../map';
import { registerGroup } from 'src/map/layer_groups';

addSource('ethiopia_forest_change_2003_2013', {
    "type": 'raster',
    'tiles': ['https://map.buttonprogram.org/eth_forest_change_2000-2013_20161019/{z}/{x}/{y}.png?v=1'],
    'tileSize': 512,
    "minzoom": 0,
    "maxzoom": 12,
    // bounds: [2, 31, 17, 53], // Ethiopia -- Somehow this breaks higher zooms???
});

addLayer({
    'id': 'ethiopia_forest_change_2003_2013-raster',
    'source': 'ethiopia_forest_change_2003_2013',
    'type': 'raster',
    BEFORE: 'FILL',
});

registerGroup('ethiopia-forests', ['ethiopia_forest_change_2003_2013-raster'])
