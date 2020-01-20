import { addLayer, addSource } from '../../map';

const fmiEnfuserSets = {
    'airquality': 'index_of_airquality_194',
    'no2': 'mass_concentration_of_nitrogen_dioxide_in_air_4902',
    'pm10': 'mass_concentration_of_pm10_ambient_aerosol_in_air_4904',
    'pm2pm5': 'mass_concentration_of_pm2p5_ambient_aerosol_in_air_4905',
    'ozone': 'mass_concentration_of_ozone_in_air_4903',
}

for (const key in fmiEnfuserSets) {
    const sourceName = `fmi-enfuser-${key}`;
    const varName = fmiEnfuserSets[key];
    addSource(sourceName, {
        "type": 'raster',
        "tiles": [`https://map.buttonprogram.org/fmi-enfuser/${varName}/{z}/{x}/{y}.png?v=2`],
        "minzoom": 9,
        "maxzoom": 13,
        bounds: [24.579, 60.132, 25.200, 60.368], // Helsinki (FMI dataset bounds anyway)
        attribution: '<a href="https://en.ilmatieteenlaitos.fi/environmental-information-fusion-service">© Finnish Meteorological Institute</a>',
    });
    addLayer({
        id: sourceName,
        'source': sourceName,
        'type': 'raster',
        paint: {
            'raster-opacity': 0.8,
        },
        BEFORE: 'FILL',
    })
}
