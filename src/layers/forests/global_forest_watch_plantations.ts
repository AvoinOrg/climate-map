import { map } from '../../map'
import { addSource, addLayer } from '../../layer_groups'
import { Popup, genericPopupHandler, fillOpacity, pp } from '../../utils'

addSource('gfw_tree_plantations', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/gfw_tree_plantations/{z}/{x}/{y}.pbf"],
    "minzoom": 0,
    "maxzoom": 12,
    attribution: '<a href="https://www.globalforestwatch.org/">© Global Forest Watch</a>',
});
addLayer({
    'id': 'gfw_tree_plantations-fill',
    'source': 'gfw_tree_plantations',
    'source-layer': 'gfw_plantations',
    'type': 'fill',
    'paint': {
        'fill-color': [
            'case', ['<', 0.4, ['get', 'peat_ratio']],
            'rgb(214, 7, 7)',
            'rgb(109, 41, 7)',
        ],
        'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'gfw_tree_plantations-outline',
    'source': 'gfw_tree_plantations',
    'source-layer': 'gfw_plantations',
    'type': 'line',
    "minzoom": 9,
    'paint': {
        'line-opacity': 0.5,
    },
    BEFORE: 'OUTLINE',
})
addLayer({
    'id': 'gfw_tree_plantations-sym',
    'source': 'gfw_tree_plantations',
    'source-layer': 'gfw_plantations',
    'type': 'symbol',
    "minzoom": 14,
    "paint": {},
    "layout": {
        "text-size": 20,
        "symbol-placement": "point",
        "text-font": ["Open Sans Regular"],
        "text-field": ['get', 'spec3'],
    },
    BEFORE: 'LABEL',
})

genericPopupHandler('gfw_tree_plantations-fill', e => {
    const f = e.features[0];
    const { image, spec_simp, type_text, area_ha, peat_ratio, avg_peatdepth } = f.properties;

    const images = image.replace(/\.(tif|img|_)/g, '').toUpperCase().split(/[,; ]+/);
    let results = '';
    images.forEach(x => {
        if (!/LGN\d/.test(x)) { return; }
        const base = x.replace(/LGN.*/, 'LGN0');
        // Most of the source images seem to fall in these categories.
        const candidates = [0, 1, 2].map(z => {
            results += `\n<li><a target="_blank" href="https://earthexplorer.usgs.gov/metadata/12864/${base + z}/">${base + x}</a></li>`;
        });
    })

    const peatInfo = peat_ratio < 0.4 ? '' : `<strong>Tropical peatland</strong><br/>\nAverage peat depth: ${avg_peatdepth.toFixed(1)} metres<br/>`;

    const co2eStr = peat_ratio < 0.4 ? '' : `Emission reduction potential when ground water level is raised by 40 cm: <strong>${pp(19.4 * area_ha)}</strong> tons CO2e/year<br/>`;

    let html = `
        <strong>Tree plantation (Global Forest Watch)</strong><br/>
        ${spec_simp}
        <br/>
        ${type_text}
        <br/>
        ${peatInfo}
        Area:${pp(area_ha, 3)} hectares
        <br/>
        ${co2eStr}
        Landsat source ID: <code>${image}</code>
        <br/>
    `
    if (results) html += `Potential Landsat source images: <ul>${results}</ul>`;

    new Popup({ maxWidth: '360px' })
        .setLngLat(e.lngLat)
        // Upstream X-Frame-Options prevents this iframe trick.
        // .setHTML(`<iframe sandbox src="https://earthexplorer.usgs.gov/metadata/12864/${image}/"></iframe>`)
        .setHTML(html)
        .addTo(map);
});
