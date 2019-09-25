// External dependencies:
// @ts-ignore
const mapboxgl0 = mapboxgl;

// This must be set, but the value is not needed here.
mapboxgl0.accessToken = 'not-needed';

export const map = new mapboxgl0.Map({
    container: 'map', // container id
    // style,
    style: 'https://tiles.stadiamaps.com/styles/alidade_smooth.json',
    center: [28, 65], // starting position [lng, lat]
    zoom: 5, // starting zoom
});

// These help in development and debugging:
if (process.env.NODE_ENV !== 'production') {
    map.showTileBoundaries = true
    // @ts-ignore
    window.map = map;
}

// Suppress uninformative console error spam:
map.on('error', (e) => {
    if (e.error.message === '') { return; }
    console.error(e.error.message, e.error.stack, e.target);
})
