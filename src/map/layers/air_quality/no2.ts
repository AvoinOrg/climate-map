import { layerGroupState } from '../../layer_groups'
import { pp } from '../../utils'
import { MapMouseEvent } from 'mapbox-gl'
import { addSource, addLayer, addMapEventHandler } from '../../map'

const no2Tileset = Number.parseInt(window.location.search.substring(1), 10) || 0
const timestampHour = Math.round(+new Date() / 1e6)
addSource('no2-tiles', {
    "type": 'raster',
    "tiles": ["https://map.buttonprogram.org/atmoshack/mbtiles-dump/" + no2Tileset + "/{z}/{x}/{y}.png?v=5&_=" + timestampHour],
    "maxzoom": 5,
    attribution: '<a href="https://www.esa.int/ESA">ESA</a>',
});

addLayer({
    'id': 'no2-raster',
    'source': 'no2-tiles',
    'type': 'raster',
    'minzoom': 0,
    'maxzoom': 10,
    paint: {
        'raster-opacity': 0.7,
    },
    BEFORE: 'FILL',
})

let reqCounter = 0
let lastRequestSeen = 0
const setNO2 = function(currentRequestNum, e, lat, lon) {
    const elem = document.getElementById('no2')
    if (!layerGroupState['no2-raster'] || !currentRequestNum) {
        elem.innerHTML = ''
        return
    }

    // A quick and dirty mechanism to monotonically show only latest entries in spite of AJAX non-determinism.
    if (lastRequestSeen > currentRequestNum) return
    lastRequestSeen = Math.max(lastRequestSeen, currentRequestNum)

    const plusCode = '' // !OpenLocationCode ? '' : `, ${OpenLocationCode.encode(lat, lon, 6)}`
    const coords = ` at Latitude:${lat}, Longitude:${lon}${plusCode}`

    if (e.error || e.no2_concentration === null || e.no2_concentration === undefined) {
        elem.innerHTML = `NO2: ${e.error}${coords}`
    } else {
        const n = e.no2_concentration
        elem.innerHTML = `NO2: ${pp(n * 1e6, 2)} µmol/m²${coords}`
    }
}

const updateNO2Reading = function(ev: MapMouseEvent) {
    if (!layerGroupState['no2-raster']) return
    const x = ev.lngLat
    const lat = x.lat.toFixed(2)
    const lon = x.lng.toFixed(2)
    const url = `https://map.buttonprogram.org/query_no2?latitude=${lat}&longitude=${lon}&v=9`
    const currentRequestNum = ++reqCounter
    fetch(url)
        .then(function(response) {
            response.json().then(e => setNO2(currentRequestNum, e, lat, lon))
        })

    // console.log(e.point.x, e.point.y, e.lngLat.lat, e.lngLat.lng)
    // var features = map.queryRenderedFeatures(e.point);
    // console.log(features)
}

// TODO: re-build this stuff later:
addMapEventHandler('mousemove', updateNO2Reading);
addMapEventHandler('click', updateNO2Reading); // for mobile devices etc.

// @ts-ignore
window.setNO2 = setNO2
