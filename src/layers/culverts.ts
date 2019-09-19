import { map } from '../map'
import { addSource, addLayer } from '../layer_groups'
import { fillOpacity, genericPopupHandler, Popup } from '../utils'
import { Expression } from 'mapbox-gl';

addSource('fi-vayla-tierummut', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/vayla.fi/TL509_0-tiles/{z}/{x}/{y}.pbf"],
    "minzoom": 0,
    "maxzoom": 9,
    bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="http://vayla.fi/">© Finnish Transport Infrastructure Agency</a>',
});

const culvertCircleRadius: Expression = [
    "step", ["zoom"],
    1, // 0..2: 1px
    3, 2,
    6, 4,
    9, ['min', 60, ['^', 1.7, ['-', ["zoom"], 7]]],
]
addLayer({
    'id': 'fi-vayla-tierummut-circle',
    'source': 'fi-vayla-tierummut',
    'source-layer': 'default',
    'type': 'circle',
    'paint': {
        'circle-color': 'black',
        'circle-radius': culvertCircleRadius,
        'circle-opacity': fillOpacity,
    },
    BEFORE: 'OUTLINE',
})

addSource('fi-vayla-ratarummut', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/vayla.fi/rata_rumpu_0-tiles/{z}/{x}/{y}.pbf"],
    "minzoom": 0,
    "maxzoom": 6,
    bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="http://vayla.fi/">© Finnish Transport Infrastructure Agency</a>',
});

addLayer({
    'id': 'fi-vayla-ratarummut-circle',
    'source': 'fi-vayla-ratarummut',
    'source-layer': 'default',
    'type': 'circle',
    'paint': {
        'circle-color': 'brown',
        'circle-radius': culvertCircleRadius,
        'circle-opacity': fillOpacity,
    },
    BEFORE: 'OUTLINE',
})

const fiVaylaTierumpuTyyppi = {
    1: 'poikkirumpu',
    2: 'yksityistieliittymärumpu',
    3: 'tuplarumpu',
    4: 'tulvarumpu',
    5: 'eläintunneli < 2 m',
    6: 'muu rumputyyppi (esim. pintavesiputki)',
    7: 'katuliittymärumpu',
    8: 'yksityistieliittymärumpu puuttuu tai sitä ei löydy',
    9: 'katuliittymärumpu puuttuu tai sitä ei löydy',
};
const fiVaylaTierumpuMateriaali = {
    11: 'betoni',
    12: 'muovi',
    13: 'teräs',
    14: 'kivi',
    9: 'muu materiaali',
};

genericPopupHandler('fi-vayla-tierummut-circle', e => {
    let html = '<div style="overflow:scroll; max-height: 500px">';
    e.features.forEach(f => {
        const p = f.properties;
        let puoli = ''
        switch (p.PUOLI) {
            case 9: puoli = 'Sijainti: Tien poikkisuunnassa<br/>';
            case 1: puoli = 'Sijainti: Tien oikealla puolella<br/>';
            case 2: puoli = 'Sijainti: Tien vasemmalla puolella<br/>';
            default: puoli = '';
        }
        html += `
        <strong>Tierumpu</strong><br/>
        ${puoli}
        Korkeus merenpinnasta: ${p.altitude.toFixed(2)} m<br/>
        Tyyppi: ${fiVaylaTierumpuTyyppi[p.RUMPUTYY] || ''}<br/>
        Pituus: ${p.RUMPUPIT} m<br/>
        Koko: ${p.RUMPUKOKO} mm<br/>
        Yksilöivä tunniste: ${p.TUNNISTE}<br/>
        Rakennettu: ${p.ALKUPVM}<br/>
        `;

    })
    html += '</div>';

    new Popup()
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
});
genericPopupHandler('fi-vayla-ratarummut-circle', e => {
    let html = '<div style="overflow:scroll; max-height: 500px">';
    e.features.forEach(f => {
        const p = f.properties;
        html += `
        <strong>Ratarumpu</strong><br/>
        Nimi: ${p.RUMPUNIMI}<br/>
        Tila: ${p.RUMPU_TILA}<br/>
        Pituus: ${p.PITUUS} m<br/>
        Aukon halkaisija: ${p.HALKAISIJA} m<br/>
        Yksilöivä tunniste: ${p.OBJECTID}<br/>
        Rakennettu: ${p.ALKUPVM}<br/>
        `;

    })
    html += '</div>';

    new Popup()
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
});
