import { map } from '../map';
import { fillOpacity } from '../utils';
import { toggleGroup, layerGroupState, addLayer, addSource, natura2000_mappings } from '../layer_groups';
import { Expression } from 'mapbox-gl';

let eteAllState = false;
const eteBasicLabels: Expression = [
    "match",
    ["get", "featurecode"],
    70, "Gamekeeping area",
    95, "Potential METSO Habitat",
    98, "METSO Habitat",
    10120, "Gamekeeping area",
    15150, "METSO II",
    "",
]

const setEteCodes = (codes) => {
    const id = 'metsaan-ete-all-sym'
    const layer = map.getStyle().layers.filter(x => x.id === id)[0]

    const eteAllLabels = [
        "match",
        ["get", "featurecode"],
        ...codes,
        "UNKNOWN habitat type",
    ];
    layer.layout['text-field'] = eteAllState ? eteBasicLabels : eteAllLabels;
    eteAllState = !eteAllState;
    map.removeLayer(id)
    addLayer(layer, layerGroupState.ete ? 'visible' : 'none')
    toggleGroup('ete', layerGroupState.ete);
}

// @ts-ignore TODO this is a quick way to break the otherwise circular dependency
window.toggleEteCodes = () => {
    fetch('ete_codes.json').then(function(response) {
        response.json().then(e => {
            setEteCodes(e);
            toggleGroup('ete', true);
        })
    })
}

const zonationVersions = [1, 2, 3, 4, 5, 6]
zonationVersions.map(v => {
    const sourceName = `zonation-v${v}`
    const id = `${sourceName}-raster`
    addSource(sourceName, {
        "type": 'raster',
        "tiles": [`https://map.buttonprogram.org/suot/zonation/MetZa2018_VMA0${v}/{z}/{x}/{y}.png?v=7`],
        "minzoom": 5,
        "maxzoom": 9,
        bounds: [19, 59, 32, 71], // Finland
        // Creative Commons 4.0
        // © SYKE Datasources: Finnish Forest Centre, Metsähallitus, Natural Resources Institute Finland, Finnish Environment Institute, National Land Survey of Finland, Hansen/UMD/Google/USGS/NASA
        attribution: '<a href="http://metatieto.ymparisto.fi:8080/geoportal/catalog/search/resource/details.page?uuid=%7B8E4EA3B2-A542-4C39-890C-DD7DED33AAE1%7D">© SYKE Datasources</a>',
    });
    addLayer({
        id,
        'source': sourceName,
        'type': 'raster',
        'minzoom': 0,
        // 'maxzoom': 10,
        paint: {
            'raster-opacity': 0.6,
        },
        BEFORE: 'FILL',
    })
})

addSource('natura2000', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/natura2000/{z}/{x}/{y}.pbf"],
    "maxzoom": 11,
    bounds: [19, 59, 32, 71], // Finland
    // SYKE applies Creative Commons By 4.0 International license for open datasets.
    attribution: '<a href=https://www.syke.fi/en-US/Open_information">SYKE</a>',
});
Object.entries(natura2000_mappings).map(([baseName, x]) => {
    addLayer({
        'id': baseName,
        'source': 'natura2000',
        'source-layer': x.layer,
        'type': 'fill',
        'paint': {
            'fill-color': x.color,
            'fill-opacity': 0.45,
        },
        BEFORE: 'FILL',
    })
    addLayer({
        'id': `${baseName}-sym`,
        'source': 'natura2000',
        'source-layer': x.layer,
        'type': 'symbol',
        "layout": {
            "text-font": ["Open Sans Regular"],
            "text-field": [
                "case",
                ["has", "nimiSuomi"], ["coalesce", ["get", "nimiSuomi"], ""],
                ["has", "nimiRuotsi"], ["coalesce", ["get", "nimiRuotsi"], ""],
                ["has", "nimi"], ["coalesce", ["get", "nimi"], ""],
                ""
            ],
        },
        paint: {
            'text-color': "#999",
            'text-halo-blur': 1,
            'text-halo-color': "rgb(242,243,240)",
            'text-halo-width': 2,
        },
        BEFORE: 'LABEL',
    })
})

addSource('metsaan-ete', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/metsaan-ete/{z}/{x}/{y}.pbf"],
    "maxzoom": 12,
    bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
});
addLayer({
    'id': 'metsaan-ete-all-c',
    'source': 'metsaan-ete',
    'source-layer': 'metsaan-ete',
    'type': 'fill',
    'paint': {
        'fill-color': 'cyan',
        'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'metsaan-ete-all-outline',
    'source': 'metsaan-ete',
    'source-layer': 'metsaan-ete',
    'type': 'line',
    "minzoom": 12,
    'paint': {
        'line-opacity': 1,
    },
    BEFORE: 'OUTLINE',
})
addLayer({
    'id': 'metsaan-ete-all-sym',
    'source': 'metsaan-ete',
    'source-layer': 'metsaan-ete',
    'type': 'symbol',
    "layout": {
        "text-font": ["Open Sans Regular"],
        "text-field": eteBasicLabels,
    },
    paint: {
        'text-color': "#999",
        'text-halo-blur': 1,
        'text-halo-color': "rgb(242,243,240)",
        'text-halo-width': 2,
    },
    BEFORE: 'LABEL',
})
