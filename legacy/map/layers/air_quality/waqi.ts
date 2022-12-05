import { addLayer, addSource } from '../../map';
import { registerGroup } from 'src/map/layer_groups';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const waqiAqis = [
    'usepa-aqi',  // Plots markers based on the composite AQI calculated with the US EPA standard.
    'usepa-pm25', // PM2.5 based AQI - if a station does not have PM2.5 reading, then it is not plotted.
    'usepa-10',   // Same as above, but for PM10.
    'usepa-o3',   // Same as above, but for Ozone (based on the 1 hour breakpoints).
    'usepa-no2',  // Same as above, but for Nitrogen Dioxide.
    'usepa-so2',  // Same as above, but for Sulfur Dioxide.
    'usepa-co',   // Same as above, but for Carbon Monoxide.
    'asean-pm10', // Asean PM10 raw PM10 concentration (explanations).
]
const waqiAqi = 'usepa-aqi';
addSource('waqi', {
    "type": 'raster',
    "tiles": [`https://tiles.waqi.info/tiles/${waqiAqi}/{z}/{x}/{y}.png?token=${process.env.WAQI_TOKEN}`],
    attribution: '<a href="https://waqi.info/">© The World Air Quality Project</a>',
});
addLayer({
    'id': 'waqi-raster',
    'source': 'waqi',
    'type': 'raster',
    paint: {
        'raster-opacity': 1.0,
    },
    BEFORE: 'FILL',
});

registerGroup('waqi', ['waqi-raster'])
