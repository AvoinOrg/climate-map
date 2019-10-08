import { addLayer, addSource } from '../../map';
import { fieldColorDefault, fieldColorHistosol, fieldPlotHistosolRatio, fieldPlotTextField, setupPopupHandlerForMaviPeltolohko } from './common'

addSource('mavi-peltolohko', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/mavi-peltolohko/{z}/{x}/{y}.pbf"],
    "maxzoom": 11,
    bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="https://www.ruokavirasto.fi/">© Finnish Food Authority</a>',
});

addLayer({
    'id': 'mavi-plohko-fill',
    'source': 'mavi-peltolohko',
    'source-layer': 'plohko_cd_2017B_2_MapInfo',
    'type': 'fill',
    'paint': {
        'fill-color': ["case", [">=", fieldPlotHistosolRatio, 0.4], fieldColorHistosol, fieldColorDefault],
        // 'fill-color': fieldAreaCO2eFillColor(fieldPlotCO2ePerHectare),
        // 'fill-color': '#FFC300',
        // 'fill-opacity': fillOpacity, // Set by fill-color rgba
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'mavi-plohko-outline',
    'source': 'mavi-peltolohko',
    'source-layer': 'plohko_cd_2017B_2_MapInfo',
    'type': 'line',
    "minzoom": 11,
    'paint': {
        'line-opacity': 0.75,
    },
    BEFORE: 'OUTLINE',
})
addLayer({
    'id': 'mavi-plohko-co2',
    'source': 'mavi-peltolohko',
    'source-layer': 'plohko_cd_2017B_2_MapInfo',
    'type': 'symbol',
    minzoom: 14.5,
    'paint': {},
    'layout': {
        "text-font": ["Open Sans Regular"],
        'text-field': fieldPlotTextField,
    },
    BEFORE: 'LABEL',
})

addLayer({
    'id': 'mavi-plohko-mineral-fill',
    'source': 'mavi-peltolohko',
    'source-layer': 'plohko_cd_2017B_2_MapInfo',
    'filter': ["<", fieldPlotHistosolRatio, 0.4],
    'type': 'fill',
    'paint': {
        'fill-color': ["case", [">=", fieldPlotHistosolRatio, 0.4], fieldColorHistosol, fieldColorDefault],
        // 'fill-color': fieldAreaCO2eFillColor(fieldPlotCO2ePerHectare),
        // 'fill-color': '#FFC300',
        // 'fill-opacity': fillOpacity, // Set by fill-color rgba
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'mavi-plohko-mineral-outline',
    'source': 'mavi-peltolohko',
    'source-layer': 'plohko_cd_2017B_2_MapInfo',
    'filter': ["<", fieldPlotHistosolRatio, 0.4],
    'type': 'line',
    "minzoom": 11,
    'paint': {
        'line-opacity': 0.75,
    },
    BEFORE: 'OUTLINE',
})
addLayer({
    'id': 'mavi-plohko-mineral-co2',
    'source': 'mavi-peltolohko',
    'source-layer': 'plohko_cd_2017B_2_MapInfo',
    'filter': ["<", fieldPlotHistosolRatio, 0.4],
    'type': 'symbol',
    minzoom: 14.5,
    'paint': {},
    'layout': {
        "text-font": ["Open Sans Regular"],
        'text-field': fieldPlotTextField,
    },
    BEFORE: 'LABEL',
})

addLayer({
    'id': 'mavi-plohko-peatland-fill',
    'source': 'mavi-peltolohko',
    'source-layer': 'plohko_cd_2017B_2_MapInfo',
    'filter': [">=", fieldPlotHistosolRatio, 0.4],
    'type': 'fill',
    'paint': {
        'fill-color': ["case", [">=", fieldPlotHistosolRatio, 0.4], fieldColorHistosol, fieldColorDefault],
        // 'fill-color': fieldAreaCO2eFillColor(fieldPlotCO2ePerHectare),
        // 'fill-color': '#FFC300',
        // 'fill-opacity': fillOpacity, // Set by fill-color rgba
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'mavi-plohko-peatland-outline',
    'source': 'mavi-peltolohko',
    'source-layer': 'plohko_cd_2017B_2_MapInfo',
    'filter': [">=", fieldPlotHistosolRatio, 0.4],
    'type': 'line',
    "minzoom": 11,
    'paint': {
        'line-opacity': 0.75,
    },
    BEFORE: 'OUTLINE',
})
addLayer({
    'id': 'mavi-plohko-peatland-co2',
    'source': 'mavi-peltolohko',
    'source-layer': 'plohko_cd_2017B_2_MapInfo',
    'filter': [">=", fieldPlotHistosolRatio, 0.4],
    'type': 'symbol',
    minzoom: 14.5,
    'paint': {},
    'layout': {
        "text-font": ["Open Sans Regular"],
        'text-field': fieldPlotTextField,
    },
    BEFORE: 'LABEL',
})

setupPopupHandlerForMaviPeltolohko('Field plot', ['mavi-plohko-fill', 'mavi-plohko-peatland-fill', 'mavi-plohko-mineral-fill']);

addSource('mavi-peltolohko-removed', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/fi-peltolohko2012/{z}/{x}/{y}.pbf.gz?v=0"],
    "maxzoom": 11,
    bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="https://www.ruokavirasto.fi/">© Finnish Food Authority</a>',
});

const fiFieldPlotRemovedFilter = ['>', 0.2, ['get', 'area_ratio']];
addLayer({
    'id': 'mavi-plohko-removed-fill',
    'source': 'mavi-peltolohko-removed',
    'source-layer': 'default',
    'type': 'fill',
    'filter': ['all', ['has', 'soil_type1'], fiFieldPlotRemovedFilter],
    'paint': {
        'fill-color': [
            "case", [">=", fieldPlotHistosolRatio, 0.4],
            'rgb(150, 52, 52)', // histosol
            'rgb(194, 21, 207)', // mineral land
        ],
        // 'fill-color': 'rgb(150, 52, 52)',
        // 'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'mavi-plohko-removed-outline',
    'source': 'mavi-peltolohko-removed',
    'source-layer': 'default',
    'filter': fiFieldPlotRemovedFilter,
    'type': 'line',
    "minzoom": 11,
    'paint': {
        'line-opacity': 0.75,
    },
    BEFORE: 'OUTLINE',
})
addLayer({
    'id': 'mavi-plohko-removed-co2',
    'source': 'mavi-peltolohko-removed',
    'source-layer': 'default',
    'filter': fiFieldPlotRemovedFilter,
    'type': 'symbol',
    minzoom: 14.5,
    'paint': {},
    'layout': {
        "text-font": ["Open Sans Regular"],
        'text-field': fieldPlotTextField,
    },
    BEFORE: 'LABEL',
})

setupPopupHandlerForMaviPeltolohko('A potentially abandoned field plot', 'mavi-plohko-removed-fill')
