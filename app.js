// This must be set, but the value is not needed here.
mapboxgl.accessToken = 'not-needed';

const map = new mapboxgl.Map({
    container: 'map', // container id
    // style,
    style: 'https://tiles.stadiamaps.com/styles/alidade_smooth.json',
    center: [28, 65], // starting position [lng, lat]
    zoom: 5, // starting zoom
});

// Suppress uninformative console error spam:
map.on('error', (e) => {
    if (e.error.message === '') return;
    console.error(e.error.message, e.error.stack, e.target);
})

// Only add the geocoding widget if it's been loaded.
if (MapboxGeocoder !== undefined) {
    map.addControl(new MapboxGeocoder({
        accessToken: process.env.GEOCODING_ACCESS_TOKEN,
        countries: 'fi',
    }));
}

map.addControl(new mapboxgl.NavigationControl());

map.addControl(new mapboxgl.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: true,
    },
    trackUserLocation: true,
}));


const backgroundLayerGroups = { 'terramonitor': true }
const layerGroupState = {
    'terramonitor': true,
}


// Set up event handlers for layer toggles, etc.
window.addEventListener('load', () => {
    [...document.querySelectorAll('.layer-card input')].forEach(el => {
        if (el.disabled) return;

        el.addEventListener('change', () => toggleGroup(el.id));

        // Populate layer state from DOM.
        layerGroupState[el.id] = el.checked;
        const known = el.id in layerGroups;
        if (!known) {
            console.log('ERROR: Unknown layer in menu .layer-cards:', el.id, el);
        }
    })
})

const layerOriginalPaint = {}
const toggleBaseMapSymbols = () => {
    map.getStyle().layers.filter(x => x.type === 'symbol').forEach(layer => {
        if (layerGroupState.terramonitor) {
            layer.paint = layerOriginalPaint[layer.id];
        } else {
            invertLayerTextHalo(layer);
        }
        map.removeLayer(layer.id);
        map.addLayer(layer);
    })
}

const natura2000_mappings = {
    "natura2000-sac": { layer: "NaturaSAC_alueet", color: 'cyan' },
    "natura2000-sac-lines": { layer: "NaturaSAC_viivat", color: 'gray' },
    "natura2000-sci": { layer: "NaturaSCI_alueet", color: 'purple' },
    "natura2000-spa": { layer: "NaturaSPA_alueet", color: 'magenta' },
    "natura2000-impl-ma": { layer: "NaturaTotTapa_ma", color: '#ca9f74' },
    "natura2000-impl-r": { layer: "NaturaTotTapa_r", color: 'brown' },
}

const layerGroups = {
    'valio': [
        () => hideAllLayersMatchingFilter(x => !/valio/.test(x)),
        'valio-fields-boundary', 'valio-fields-fill', 'valio-plohko-co2',
    ],
    'forest-grid': ['metsaan-hila-c', 'metsaan-hila-sym', 'metsaan-hila-outline'],
    'privately-owned-forests': [
        'metsaan-stand-fill', 'metsaan-stand-co2', 'metsaan-stand-outline', 'metsaan-stand-raster',
    ],
    'zonation6': ['zonation-v6-raster'],
    'ete': ['metsaan-ete-all-c', 'metsaan-ete-all-outline', 'metsaan-ete-all-sym'],
    'ete-all-labels': [() => toggleEteCodes()],
    'terramonitor': ['terramonitor', () => toggleBaseMapSymbols()],
    'no2-raster': ['no2-raster', () => window.setNO2()],
    'mangrove-forests': ['mangrove-wms'],
    'natura2000': [
        ...Object.keys(natura2000_mappings).map(x => x),
        ...Object.keys(natura2000_mappings).map(x => `${x}-sym`),
    ],
    'mavi-fields': ['mavi-plohko-fill', 'mavi-plohko-outline', 'mavi-plohko-co2'],
    'helsinki-buildings': ['helsinki-buildings-fill', 'helsinki-buildings-outline', 'helsinki-buildings-co2'],
    'fmi-enfuser-airquality': ['fmi-enfuser-airquality'],
    'fmi-enfuser-pm2pm5': ['fmi-enfuser-pm2pm5'],
    'fmi-enfuser-pm10': ['fmi-enfuser-pm10'],
    'fmi-enfuser-no2': ['fmi-enfuser-no2'],
    'fmi-enfuser-ozone': ['fmi-enfuser-ozone'],
    'hsy-solar-potential': ['hsy-solar-potential-fill', 'hsy-solar-potential-outline', 'hsy-solar-potential-sym'],
    'gtk-mp20k-maalajit': ['gtk-mp20k-maalajit-fill', 'gtk-mp20k-maalajit-outline', 'gtk-mp20k-maalajit-sym'],
};

const toggleGroup = (group, forcedState = undefined) => {
    const oldState = layerGroupState[group];
    const newState = forcedState === undefined ? !oldState : forcedState;
    if (oldState === newState) return;

    const el = document.querySelector(`.layer-card input#${group}`)
    if (el) el.checked = newState

    layerGroups[group].forEach(layer => {
        if (typeof layer === 'function') {
            layer();
        } else {
            map.setLayoutProperty(layer, 'visibility', newState ? 'visible' : 'none');
        }
    })
    layerGroupState[group] = newState;
}

window.toggleSatellite = function () {
    [...document.querySelectorAll('.satellite-button-container img')].forEach(x => x.toggleAttribute('hidden'));
    toggleGroup('terramonitor');
}
window.toggleMenu = function () {
    [...document.querySelectorAll('.menu-toggle')].forEach(x => x.toggleAttribute('hidden'))
}


let eteAllState = false;
const eteBasicLabels = [
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
    addLayer(layer, visibility = layerGroupState.ete ? 'visible' : 'none')
    toggleGroup('ete', forcedState = layerGroupState.ete);
}

const toggleEteCodes = () => {
    fetch('ete_codes.json').then(function (response) {
        response.json().then(e => {
            setEteCodes(e);
            toggleGroup('ete', forcedState = true);
        })
    })
}


const hideAllLayersMatchingFilter = (filterFn) => {
    Object.keys(layerGroupState).forEach(group => {
        const layerIsInBackground = group in backgroundLayerGroups;
        if (layerIsInBackground) return;
        if (filterFn && !filterFn(group)) return;
        toggleGroup(group, forcedState = false);
    })
}

const invertLayerTextHalo = (layer) => {
    layer.paint = { ...layer.paint }
    if (layer.paint && layer.paint["text-halo-width"]) {
        // Original style is something like:
        // text-color: "#999"
        // text-halo-blur: 1
        // text-halo-color: "rgb(242,243,240)"
        // text-halo-width: 2
        layer.paint['text-halo-blur'] = 1
        layer.paint['text-halo-width'] = 2.5
        layer.paint['text-color'] = '#fff'
        layer.paint['text-halo-color'] = '#000'
    }
}

const enableDefaultLayers = () => {
    Object.entries(layerGroupState).forEach(([group, enabled]) => {
        enabled && layerGroups[group].forEach(layer => {
            typeof layer === 'string' &&
                map.setLayoutProperty(layer, 'visibility', 'visible');
        });
    })
}


// NB: By using the '/' operator instead of '*', we get rid of float bugs like 1.2000000000004.
const roundToSignificantDigits = (n, expr) => [
    // Multiply back by true scale
    '/',
    // Round to two significant digits:
    [
        'round', [
            '/',
            expr,
            ['^', 10, ['+', -n+1, ['floor', ['log10', expr]]]],
        ],
    ],
    ['^', 10, ['-', n-1, ['floor', ['log10', expr]]]],
]

// Ruokavirasto field plots CO2e formulas:
//
// histosol: 400t CO2eq/ha/20yrs -> 20t CO2e/ha/y -> 2kg/m2/y
//
// non-histosol: 2.2 CO2e/ha/year as an average for the period of 10 years.
// -> 0.22kg/m2/y
const histosolCalc = roundToSignificantDigits(2, ['*', 20 * 1e-4, ['get', 'total_area']]);
const nonHistosolCalc = roundToSignificantDigits(2, ['*', 2.2 * 1e-4, ['get', 'total_area']]);

// Unit: tons of CO2e per hectare per annum.
const fieldPlotCO2ePerHectare = [
    "case", [">=", ["get", "histosol_ratio"], 0.5], 20, 2.2,
];

const fieldPlotTextField = [
    "step", ["zoom"],

    // 0 <= zoom < 15.5:
    [
        "case", [">=", ["get", "histosol_ratio"], 0.5], [
            "concat", histosolCalc, " t/y",
        ], [ // else: non-histosol (histosol_area < 50%)
            "concat", nonHistosolCalc, " t/y",
        ],
    ],

    // zoom >= 15.5:
    15.5,
    [
        "case", [">=", ["get", "histosol_ratio"], 0.5], [
            "concat",
            histosolCalc,
            "t CO2e/y",
            '\nsoil: histosol',
            // "\npeat:", ["/", ["round", ['*', 0.001, ['to-number', ["get", "histosol_area"], 0]]], 10], 'ha',
            "\narea: ", ["/", ["round", ['*', 0.001, ["get", "total_area"]]], 10], "ha",
        ], [ // else: non-histosol (histosol_area < 50%)
            "concat",
            nonHistosolCalc,
            "t CO2e/y",
            '\nsoil: mineral',
            "\narea: ", ["/", ["round", ['*', 0.001, ["get", "total_area"]]], 10], "ha",
        ],
    ],
];


const fillOpacity = 0.65;

const areaCO2eFillColorInterp = expr => [
    'interpolate',
    ['linear'],
    expr,
    0, 'rgba(255, 255, 0, 0.65)',
    2, 'rgba(255, 165, 0, 0.55)',
    5, 'rgba(235, 0, 0, 0.65)',
];
const areaCO2eFillColorStep = expr => [
    'step',
    expr,
    'rgba(255, 255, 0, 0.65)',
    2, 'rgba(255, 165, 0, 0.5)',
    5, 'rgba(235, 0, 0, 0.65)',
];
const areaCO2eFillColor = areaCO2eFillColorInterp;



const addLayer = (layer, visibility = 'none') => {
    const layout = layer.layout || {}
    layout.visibility = visibility
    map.addLayer({ layout, ...layer })
}

map.on('load', () => {
    const originalMapLayerIds = {}

    addLayer({
        'id': 'terramonitor',
        'type': 'raster',
        'source': {
            'type': 'raster',
            'tiles': [
                'https://maps.terramonitor.com/9c2040ec0fb91cfdfd723496515d759a77b363ee/pro/wms?bbox={bbox-epsg-3857}&format=image/jpeg&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=rgb&styles=',
            ],
            'tileSize': 256,
            // "maxzoom": 16, // After zoom level 16 the images (used to) get blurrier
            attribution: '<a href="https://www.terramonitor.com">© Terramonitor</a>',
        },
        'paint': {},
    });



    map.getStyle().layers.forEach(x => originalMapLayerIds[x.id] = true)


    map.addSource('metsaan-hila', {
        "type": "vector",
        "tiles": ["https://map.buttonprogram.org/metsaan-hila/{z}/{x}/{y}.pbf"],
        "maxzoom": 15,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
    });
    addLayer({
        'id': 'metsaan-hila-c',
        'source': 'metsaan-hila',
        'source-layer': 'metsaan-hila',
        'type': 'fill',
        'paint': {
            'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'age'],
                0, 'rgb(218,248,85)', // green
                70, 'rgb(252,113,34)', // orange
                100, 'rgb(245,17,72)', // red
            ],
            'fill-opacity': fillOpacity,
        },
    })
    addLayer({
        'id': 'metsaan-hila-outline',
        'source': 'metsaan-hila',
        'source-layer': 'metsaan-hila',
        'type': 'line',
        "minzoom": 14,
        'paint': {
            'line-opacity': 0.75,
        }
    })
    addLayer({
        'id': 'metsaan-hila-sym',
        'source': 'metsaan-hila',
        'source-layer': 'metsaan-hila',
        'type': 'symbol',
        "minzoom": 15,
        // 'maxzoom': zoomThreshold,
        "paint": {},
        "layout": {
            "symbol-placement": "point",
            "text-font": ["Open Sans Regular"],
            "text-field": 'Age:{age} Avg.Diameter:{meandiameter}',
            "text-size": 10,
        }
    })


    map.addSource('natura2000', {
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
        })
    })


    map.addSource('metsaan-ete', {
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
    })
    addLayer({
        'id': 'metsaan-ete-all-outline',
        'source': 'metsaan-ete',
        'source-layer': 'metsaan-ete',
        'type': 'line',
        "minzoom": 12,
        'paint': {
            'line-opacity': 1,
        }
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
    })


    map.addSource('mavi-peltolohko', {
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
            // 'fill-color': '#FFC300',
            'fill-color': areaCO2eFillColor(fieldPlotCO2ePerHectare),
            // 'fill-opacity': fillOpacity, // Set by fill-color rgba
        }
    })
    addLayer({
        'id': 'mavi-plohko-outline',
        'source': 'mavi-peltolohko',
        'source-layer': 'plohko_cd_2017B_2_MapInfo',
        'type': 'line',
        "minzoom": 11,
        'paint': {
            'line-opacity': 0.75,
        }
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
        }
    })


    map.addSource('helsinki-buildings', {
        "type": "vector",
        "tiles": ["https://map.buttonprogram.org/helsinki-buildings/{z}/{x}/{y}.pbf"],
        "maxzoom": 14,
        // Bounds source: https://koordinates.com/layer/4257-finland-11000000-administrative-regions/
        // select ST_Extent(ST_Transform(ST_SetSRID(geom,3067), 4326))
        // from "finland-11000000-administrative-regions" where kunta_ni1='Helsinki';
        bounds: [24, 59, 26, 61],
        attribution: '<a href="https://www.hel.fi">© City of Helsinki</a>',
    });
    addLayer({
        'id': 'helsinki-buildings-fill',
        'source': 'helsinki-buildings',
        'source-layer': 'Rakennukset_alue',
        'type': 'fill',
        'paint': {
            'fill-color': 'cyan',
            'fill-opacity': fillOpacity,
        }
    })
    addLayer({
        'id': 'helsinki-buildings-outline',
        'source': 'helsinki-buildings',
        'source-layer': 'Rakennukset_alue',
        'type': 'line',
        "minzoom": 11,
        'paint': {
            'line-opacity': 0.75,
        }
    })

    // (60 kWh/m3)  * (0.250 CO2e kg/kWh) -> 15kg/m3
    addLayer({
        'id': 'helsinki-buildings-co2',
        'source': 'helsinki-buildings',
        'source-layer': 'Rakennukset_alue',
        'type': 'symbol',
        "minzoom": 16,
        'paint': {},
        "layout": {
            "symbol-placement": "point",
            "text-font": ["Open Sans Regular"],
            "text-size": 20,
            "text-field": [
                "case", ["has", "i_raktilav"], [
                    'let',
                    "co2", ['/', ['*', 15, ['to-number', ["get", "i_raktilav"], 0]], 1000],
                    [
                        'concat',
                        roundToSignificantDigits(2, ['var', 'co2']), // kg -> tons
                        ' t CO2e/y',
                    ],
                ], "",
            ],
        },
    })


    map.addSource('metsaan-stand', {
        "type": "vector",
        "tiles": ["https://map.buttonprogram.org/stand2/{z}/{x}/{y}.pbf.gz?v=2"],
        "minzoom": 12,
        "maxzoom": 13,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
    });

    // TODO: maybe enable this in the future?
    const fillColorCO2e = areaCO2eFillColor([
        'case',
        ['has', 'co2'],
        [
            'let',
            'co2', ['to-number', ['get', 'co2'], 0],
            'area', ['*', 1e-4, ['to-number', ['get', 'st_area'], 0]],
            [
                'case', ['==', ['var', 'area'], 0], 0,
                ['/', ['var', 'co2'], ['var', 'area']],
            ],
        ],
        0,
    ]);
    // The original fill color. Consistent with the raster overview images at the moment.
    const fillColorFertilityClass = [
        'interpolate',
        ['linear'],
        ['get', 'fertilityclass'],
        1, 'rgba(245,17,72,0.8)', // red
        4, 'rgba(252,113,34,0.8)', // orange
        // 8, 'rgba(218,248,85,0.8)',
        6, 'rgba(218,248,85,0.8)', // green
    ];
    addLayer({
        'id': 'metsaan-stand-fill',
        'source': 'metsaan-stand',
        'source-layer': 'stand',
        'type': 'fill',
        'paint': {
            'fill-color': fillColorFertilityClass,
            // 'fill-opacity': fillOpacity, // Set by fill-color rgba
        },
    })
    addLayer({
        'id': 'metsaan-stand-outline',
        'source': 'metsaan-stand',
        'source-layer': 'stand',
        'type': 'line',
        "minzoom": 11,
        // 'maxzoom': zoomThreshold,
        'paint': {
            'line-opacity': 0.5,
        }
    })
    addLayer({
        'id': 'metsaan-stand-co2',
        'source': 'metsaan-stand',
        'source-layer': 'stand',
        'type': 'symbol',
        "minzoom": 15.5,
        // 'maxzoom': zoomThreshold,
        "paint": {},
        "layout": {
            "text-size": 20,
            "symbol-placement": "point",
            "text-font": ["Open Sans Regular"],
            "text-field": [
                "case", ["has", "co2"], [
                    "case", ["<", ["to-number", ["get", "co2"], 0], 0.1], "", [
                        "concat",
                        ["get", "co2"],
                        "t CO2e/y",
                    ],
                ], "",
            ],
        }
    })

    map.addSource('metsaan-stand-raster', {
        "type": "raster",
        'tiles': ['https://map.buttonprogram.org/stand2/{z}/{x}/{y}.png?v=3'],
        'tileSize': 512,
        "maxzoom": 12,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
    });

    addLayer({
        'id': 'metsaan-stand-raster',
        'source': 'metsaan-stand-raster',
        'type': 'raster',
        'minzoom': 0,
        'maxzoom': 12,
    })


    const no2Tileset = Number.parseInt(window.location.search.substring(1)) || 0
    const timestampHour = Math.round(+new Date() / 1e6)
    map.addSource('no2-tiles', {
        "type": "raster",
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
    })


    addLayer({
        'id': 'mangrove-wms',
        'type': 'raster',
        'source': {
            'type': 'raster',
            'tiles': [
                'https://gis.unep-wcmc.org/arcgis/services/marine/GMW_001_MangroveDistribition_2010/MapServer/WMSServer?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=0&styles=default',
            ],
            'tileSize': 256,
            bounds: [-175.3, -38.8, 179.9, 33.8],
            // Creative Commons Attribution 4.0 Unported (CC BY 4.0)
            // http://data.unep-wcmc.org/pdfs/45/WCMC-043-GlobalCH-IFCPS6-2017.pdf
            attribution: '<a href="https://www.eorc.jaxa.jp/ALOS/en/kyoto/mangrovewatch.htm">Global Mangrove Watch</a>',
        },
        'paint': {}
    })


    const zonationVersions = [1, 2, 3, 4, 5, 6]
    zonationVersions.map(v => {
        const sourceName = `zonation-v${v}`
        const id = `${sourceName}-raster`
        map.addSource(sourceName, {
            "type": "raster",
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
        })
    })


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
        map.addSource(sourceName, {
            "type": "raster",
            "tiles": [`https://map.buttonprogram.org/fmi-enfuser/${varName}/{z}/{x}/{y}.png?v=2`],
            "minzoom": 9,
            "maxzoom": 13,
            bounds: [ 24.579, 60.132, 25.200, 60.368 ], // Helsinki (FMI dataset bounds anyway)
            attribution: '<a href="https://en.ilmatieteenlaitos.fi/environmental-information-fusion-service">© Finnish Meteorological Institute</a>',
        });
        addLayer({
            id: sourceName,
            'source': sourceName,
            'type': 'raster',
            paint: {
                'raster-opacity': 0.8,
            },
        })
    }


    // https://www.hsy.fi/fi/asiantuntijalle/avoindata/Sivut/AvoinData.aspx?dataID=41
    // https://www.hsy.fi/fi/asiantuntijalle/avoindata/lisenssi/Sivut/default.aspx
    // CC 4.0 BY, ByAttribution
    map.addSource('hsy-solar-potential', {
        "type": "vector",
        "tiles": ["https://map.buttonprogram.org/hsy-aurinkosahkopotentiaali/{z}/{x}/{y}.pbf"],
        "minzoom": 1,
        "maxzoom": 14,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="https://www.hsy.fi/">© HSY</a>',
    });

    addLayer({
        'id': 'hsy-solar-potential-fill',
        'source': 'hsy-solar-potential',
        'source-layer': 'solarpower_potential',
        'type': 'fill',
        'paint': {
            'fill-color': [
                "case", ["has", "ELEC"], [
                    "case", ["<", 0, ["get", "ELEC"]], 
                    '#92b565',
                    'gray',
                ],
                'gray',
            ],
            // areaCO2eFillColor(['*', 1e-3, ['get', 'CO2']]), // The variable CO2 is not documented at all!
            'fill-opacity': fillOpacity,
        },
    })
    addLayer({
        'id': 'hsy-solar-potential-outline',
        'source': 'hsy-solar-potential',
        'source-layer': 'solarpower_potential',
        'type': 'line',
        "minzoom": 11,
        // 'maxzoom': zoomThreshold,
        'paint': {
            'line-opacity': 0.5,
        }
    })
    addLayer({
        'id': 'hsy-solar-potential-sym',
        'source': 'hsy-solar-potential',
        'source-layer': 'solarpower_potential',
        'type': 'symbol',
        "minzoom": 17,
        // 'maxzoom': zoomThreshold,
        "paint": {},
        "layout": {
            "text-size": 20,
            "symbol-placement": "point",
            "text-font": ["Open Sans Regular"],
            "text-field": [
                "case", ["has", "ELEC"], [
                    "case", ["<", 0, ["get", "ELEC"]], [
                        "concat",
                        // roundToSignificantDigits(2, ['*', 1e-3, ["get", "CO2"]]), // TODO: Get documentation for this!
                        // "t CO2e/y",
                        // "\nElectricity generation: ",
                        roundToSignificantDigits(2, ['*', 1e-3, ["get", "ELEC"]]),
                        " MWh/year"
                    ],
                    "",
                ],
                "",
            ],
        }
    })


    map.addSource('gtk-mp20k-maalajit', {
        "type": "vector",
        "tiles": ["https://map.buttonprogram.org/mp20k_maalajit/{z}/{x}/{y}.pbf?v=2"],
        "minzoom": 0,
        "maxzoom": 12,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="https://www.hsy.fi/">© HSY</a>',
    });
    addLayer({
        'id': 'gtk-mp20k-maalajit-fill',
        'source': 'gtk-mp20k-maalajit',
        'source-layer': 'mp20k_maalajit',
        'type': 'fill',
        'paint': {
            'fill-color': 'brown',
            // areaCO2eFillColor(['*', 1e-3, ['get', 'CO2']]), // The variable CO2 is not documented at all!
            'fill-opacity': fillOpacity,
        },
    })
    addLayer({
        'id': 'gtk-mp20k-maalajit-outline',
        'source': 'gtk-mp20k-maalajit',
        'source-layer': 'mp20k_maalajit',
        'type': 'line',
        "minzoom": 11,
        // 'maxzoom': zoomThreshold,
        'paint': {
            'line-opacity': 0.5,
        }
    })
    addLayer({
        'id': 'gtk-mp20k-maalajit-sym',
        'source': 'gtk-mp20k-maalajit',
        'source-layer': 'mp20k_maalajit',
        'type': 'symbol',
        "minzoom": 15.5,
        // 'maxzoom': zoomThreshold,
        "paint": {},
        "layout": {
            "text-size": 20,
            "symbol-placement": "point",
            "text-font": ["Open Sans Regular"],
            "text-field": ['concat',
                'topsoil: ', ['get', 'pintamaalaji'],
                '\nsubsoil: ', ['get', 'pohjamaalaji'],
            ],
        }
    })


    enableDefaultLayers();

    // Ensure all symbol layers appear on top of satellite imagery.
    map.getStyle().layers.filter(x => x.type === 'symbol').forEach(layer => {
        // Rework Stadia default style to look nicer on top of satellite imagery
        layerOriginalPaint[layer.id] = { ...layer.paint }
        invertLayerTextHalo(layer)
        map.removeLayer(layer.id)
        map.addLayer(layer)
        // map.moveLayer(layer.id)
    });

});  // /map onload


const privateDatasets = {}

privateDatasets.valio = (map, secret) => {
    map.addSource('valio_fields', {
        "type": "vector",
        "tiles": [`https://map.buttonprogram.org/private/${secret}/valio_fields/{z}/{x}/{y}.pbf?v=3`],
        bounds: [19, 59, 32, 71], // Finland
        "maxzoom": 11,
    });

    addLayer({
        'id': 'valio-fields-fill',
        'source': 'valio_fields',
        'source-layer': 'valio_fields',
        'type': 'fill',
        'paint': {
            'fill-color': areaCO2eFillColor(fieldPlotCO2ePerHectare),
            // 'fill-opacity': fillOpacity, // Set by fill-color rgba
        },
    })
    addLayer({
        'id': 'valio-fields-boundary',
        'source': 'valio_fields',
        'source-layer': 'valio_fields',
        'type': 'line',
        'paint': {
            'line-opacity': 0.75,
        },
        "minzoom": 11,
    })

    addLayer({
        'id': 'valio-plohko-co2',
        'source': 'valio_fields',
        'source-layer': 'valio_fields',
        // 'source-layer': 'suopellot',
        'type': 'symbol',
        "minzoom": 14.5,
        // 'maxzoom': zoomThreshold,
        "paint": {},
        "layout": {
            "symbol-placement": "point",
            "text-font": ["Open Sans Regular"],
            "text-size": 20,
            // NB: 400t CO2eq/ha/20yrs -> 2kg/m2/y
            // round(0.0002*total_area) -> reduce precision -> *10 -> 2kg/m2
            "text-field": fieldPlotTextField,
        }
    })
};


window.enablePrivateDatasets = (secrets = []) => {
    if (secrets.length === 0) return;
    map.on('load', () => {
        secrets.forEach(secret => {
            const name = secret.split('-')[0];
            const addLayerFn = privateDatasets[name];
            console.log('Enabled private dataset:', name)
            addLayerFn(map, secret);
            document.querySelector(`#layer-card-${name}`).removeAttribute('hidden');

            if (name === 'valio') {
                // Enable the Valio fields and the Biodiversity layers by default only.
                hideAllLayersMatchingFilter(x => /./.test(x));
                toggleGroup('valio');
                toggleGroup('zonation6');
            }
        });

        // Ensure we add the new layers to the general bookkeeping.
        map.getStyle().layers.filter(x => x.type === 'symbol').forEach(layer => {
            if (layer.id in layerOriginalPaint) return;
            layerOriginalPaint[layer.id] = { ...layer.paint }
        });
    });
}


let reqCounter = 0
let lastRequestSeen = 0
window.setNO2 = function (currentRequestNum, e, lat, lon) {
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
        elem.innerHTML = `NO2: ${(n * 1e6).toFixed(1)} µmol/m<sup>2</sup>${coords}`
    }
}


const updateNO2Reading = function (e) {
    if (!layerGroupState['no2-raster']) return
    const x = e.lngLat
    const lat = x.lat.toFixed(2)
    const lon = x.lng.toFixed(2)
    const url = `https://map.buttonprogram.org/query_no2?latitude=${lat}&longitude=${lon}&v=9`
    const currentRequestNum = ++reqCounter
    fetch(url)
        .then(function (response) {
            response.json().then(e => window.setNO2(currentRequestNum, e, lat, lon))
        })

    // console.log(e.point.x, e.point.y, e.lngLat.lat, e.lngLat.lng)
    // var features = map.queryRenderedFeatures(e.point);
    // console.log(features)
}

map.on('mousemove', updateNO2Reading);
map.on('click', updateNO2Reading); // for mobile devices etc.
