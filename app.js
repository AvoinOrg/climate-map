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
        () => hideAllLayersMatchingFilter(x => /mature-forests/.test(x)),
        'metsaan-stand-fill', 'metsaan-stand-co2', 'metsaan-stand-outline', 'metsaan-stand-raster',
    ],
    'mature-forests': [
        () => hideAllLayersMatchingFilter(x => /privately-owned-forests/.test(x)),
        'metsaan-stand-mature-fill', 'metsaan-stand-outline', 'metsaan-stand-mature-sym', 'metsaan-stand-mature-raster',
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
    'mavi-fields': [
        () => hideAllLayersMatchingFilter(x => x === 'valio'),
        'mavi-plohko-fill', 'mavi-plohko-outline', 'mavi-plohko-co2'
    ],
    'helsinki-buildings': ['helsinki-buildings-fill', 'helsinki-buildings-outline', 'helsinki-buildings-co2'],
    'fmi-enfuser-airquality': ['fmi-enfuser-airquality'],
    'fmi-enfuser-pm2pm5': ['fmi-enfuser-pm2pm5'],
    'fmi-enfuser-pm10': ['fmi-enfuser-pm10'],
    'fmi-enfuser-no2': ['fmi-enfuser-no2'],
    'fmi-enfuser-ozone': ['fmi-enfuser-ozone'],
    'waqi': ['waqi-raster'],
    'hsy-solar-potential': ['hsy-solar-potential-fill', 'hsy-solar-potential-outline', 'hsy-solar-potential-sym'],
    'gtk-mp20k-maalajit': ['gtk-mp20k-maalajit-fill', 'gtk-mp20k-maalajit-outline', 'gtk-mp20k-maalajit-sym'],
    'cifor-peatdepth': ['cifor-peatdepth-raster'],
    'cifor-wetlands': ['cifor-wetlands-raster'],
    'gfw_tree_plantations': ['gfw_tree_plantations-fill', 'gfw_tree_plantations-outline', 'gfw_tree_plantations-sym'],
    'snow_cover_loss': ['snow_cover_loss-fill', 'snow_cover_loss-sym'],
    'corine_clc2018': ['corine_clc2018-fill', 'corine_clc2018-outline', 'corine_clc2018-sym'],
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
            map.moveLayer(layer); // Make this the topmost layer.
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
//
// NB: dataset attribute "pinta_ala" (area) is in acres, not m2 or hectares.

// NB: Duplicated logic because I don't know how to interpret
// Mapbox style expressions in outside contexts.
const fieldPlotCO2eFn = props => {
    const isHistosolType = t => [-104,195511,195512,195513,195514].indexOf(t) !== -1;
    const histosolRatio = (
        + (isHistosolType(props.soil_type1) ? props.soil_type1_ratio : 0)
        + (isHistosolType(props.soil_type2) ? props.soil_type2_ratio : 0)
    );
    const co2ePerHa = histosolRatio >= 0.4 ? 20 : 2.2;
    const areaHa = 1e-2 * props.pinta_ala;
    return areaHa * co2ePerHa; // tons per ha
}

const histosolCalc = roundToSignificantDigits(2, ['*', 20 * 1e-2, ['get', 'pinta_ala']]);
const nonHistosolCalc = roundToSignificantDigits(2, ['*', 2.2 * 1e-2, ['get', 'pinta_ala']]);

const fieldPlotHistosolMult = v => [
    'match', v,
    -104, 1, // Histosols
    195511, 1, // Lieju (Lj) RT
    195512, 1, // Saraturve (Ct) RT
    195513, 1, // Rahkaturve (St) RT
    195514, 1, // Turvetuotantoalue (Tu) RT
    0,
];
const fieldPlotHistosolRatio = [
    '+',
    ['*', fieldPlotHistosolMult(["get", "soil_type1"]), ["max", 0, ["get", "soil_type1_ratio"]]],
    ['*', fieldPlotHistosolMult(["get", "soil_type2"]), ["max", 0, ["get", "soil_type2_ratio"]]],
];

// Unit: tons of CO2e per hectare per annum.
const fieldPlotCO2ePerHectare = [
    "case", [">=", fieldPlotHistosolRatio, 0.4], 20, 2.2,
];

const fieldPlotTextField = [
    "step", ["zoom"],

    // 0 <= zoom < 15.5:
    [
        "case", [">=", fieldPlotHistosolRatio, 0.4], [
            "concat", histosolCalc, " t/y",
        ], [ // else: non-histosol (histosol_area < 50%)
            "concat", nonHistosolCalc, " t/y",
        ],
    ],

    // zoom >= 15.5:
    15.5,
    [
        "case", [">=", fieldPlotHistosolRatio, 0.4], [
            "concat",
            histosolCalc,
            "t CO2e/y",
            '\nsoil: histosol',
            // "\npeat:", ["/", ["round", ['*', 0.001, ['to-number', ["get", "histosol_area"], 0]]], 10], 'ha',
            "\narea: ", ["/", ["round", ['*', 0.1, ["get", "pinta_ala"]]], 10], "ha",
        ], [ // else: non-histosol (histosol_area < 50%)
            "concat",
            nonHistosolCalc,
            "t CO2e/y",
            '\nsoil: mineral',
            "\narea: ", ["/", ["round", ['*', 0.1, ["get", "pinta_ala"]]], 10], "ha",
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


function getGeoJsonGeometryBounds(coordinates) {
    if (typeof coordinates[0] === 'number') {
        const [lon, lat] = coordinates;
        return [lon, lat, lon, lat];
    }

    const bounds = [999,999,-999,-999];
    for (const x of coordinates) {
        const bounds2 = getGeoJsonGeometryBounds(x)
        bounds[0] = Math.min(bounds[0], bounds2[0]);
        bounds[1] = Math.min(bounds[1], bounds2[1]);
        bounds[2] = Math.max(bounds[2], bounds2[2]);
        bounds[3] = Math.max(bounds[3], bounds2[3]);
    }
    return bounds;
}
function getGeoJsonGeometryCenter(coordinates) {
    const bounds = getGeoJsonGeometryBounds(coordinates);
    return [ (bounds[0] + bounds[2])/2, (bounds[1] + bounds[3])/2 ];
}


const originalLayerDefs = {};
const addLayer = (layer, visibility = 'none') => {
    const layout = layer.layout || {}
    layout.visibility = visibility
    map.addLayer({ layout, ...layer });
    originalLayerDefs[layer.id] = layer;
}

const originalSourceDefs = {}
const addSource = (name, source) => {
    map.addSource(name, source);
    originalSourceDefs[name] = source;
}



const gtkLukeSoilTypes = {
    // Placeholder value:
    "-1": null,

    // LUKE.fi soil types (soilOfFinland2015):
    "-101": 'Anthrosols',
    "-102": 'Arenosols/Podzols',
    "-103": 'Gleysols',
    "-104": 'Histosols',
    "-105": 'Leptosols',
    "-106": 'Podzols',
    "-107": 'Podzols/Arenosols',
    "-108": 'Regosols',
    "-109": 'Stagnosols',

    // GTK.fi soil types (mp20k_maalajit):
    195111: 'Kalliomaa (Ka) RT',
    195112: 'Rakka (RaKa) RT',
    195113: 'Rapakallio (RpKa) RT',
    195213: 'Soramoreeni (SrMr) RT',
    195214: 'Hiekkamoreeni (Mr) RT',
    195215: 'Hienoainesmoreeni (HMr) RT',
    195311: 'Lohkareita (Lo) RT',
    195312: 'Kiviä (Ki) RT',
    195313: 'Sora (Sr) RT',
    195314: 'Hiekka (Hk) RT',
    195315: 'karkea Hieta (KHt) RT',
    195411: 'hieno Hieta (HHt) RT',
    195412: 'Hiesu (Hs) RT',
    195413: 'Savi (Sa) RT',
    195511: 'Lieju (Lj) RT',
    195512: 'Saraturve (Ct) RT',
    195513: 'Rahkaturve (St) RT',
    195514: 'Turvetuotantoalue (Tu) RT',
    195601: 'Täytemaa (Ta)',
    195602: 'Kartoittamaton (0)',
    195603: 'Vesi (Ve)',
    19531421: 'liejuinen Hiekka (LjHk) RT',
    19531521: 'liejuinen Hieta (karkea) (LjHt) RT',
    19541121: 'liejuinen hieno Hieta (LjHHt) RT',
    19541221: 'Liejuhiesu (LjHs) RT',
    19541321: 'Liejusavi (LjSa) RT',
};


const setupPopupHandlerForMaviPeltolohko = layerName => {
    map.on('click', layerName, e => {
        const f = e.features[0];
        const coordinates = getGeoJsonGeometryCenter(f.geometry.coordinates);
        const { soil_type1, soil_type1_ratio, soil_type2, soil_type2_ratio, pinta_ala } = f.properties;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        let html = ''
        if (soil_type1 !== -1) {
            html += `
                Primary soil: ${gtkLukeSoilTypes[soil_type1]} (${Math.round(100 * soil_type1_ratio)} %)
                <br/>
            `;
        }
        if (soil_type2 !== -1 && soil_type1_ratio <= 0.99) {
            html += `
            Secondary soil: ${gtkLukeSoilTypes[soil_type2]} (${Math.round(100 * soil_type2_ratio)} %)
            <br/>
            `;
        }
        html += `
            Area: ${pinta_ala.toFixed(1)} hectares
            <br/>
            Emission reduction potential: ${fieldPlotCO2eFn(f.properties).toFixed(1)} tons CO₂e per year
        `;

        new mapboxgl.Popup()
        .setLngLat(coordinates)
        .setHTML(html)
        .addTo(map);
    });
    map.on('mouseenter', layerName, function () {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layerName, function () {
        map.getCanvas().style.cursor = '';
    });
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


    addSource('metsaan-hila', {
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

    setupPopupHandlerForMaviPeltolohko('mavi-plohko-fill');


    addSource('helsinki-buildings', {
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


    addSource('metsaan-stand', {
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
    const fillRegenerationFelling = [
        'case', ['>=', 0.5, ['get', 'regeneration_felling_prediction']],
        'rgba(73, 25, 2320, 0.65)',
        'rgba(206, 244, 66, 0.35)',
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

    addSource('metsaan-stand-raster', {
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
    });


    addLayer({
        'id': 'metsaan-stand-mature-fill',
        'source': 'metsaan-stand',
        'source-layer': 'stand',
        'type': 'fill',
        minzoom:12,
        'paint': {
            // 'fill-color': fillColorFertilityClass,
            'fill-color': fillRegenerationFelling,
            // 'fill-opacity': fillOpacity, // Set by fill-color rgba
        },
    })
    const treeSpeciesText = speciesId => [
        "match", speciesId,
        1,"Pine",
        2,"Spruce",
        3,"Silver birch",
        4,"Downy birch",
        5,"Asp",
        6,"Grey alder",
        7,"Black alder",
        8,"Other coniferous tree",
        9,"Other deciduous tree",
        10,"Oregon pine",
        11,"Common juniper",
        12,"Contorta pine",
        13,"European white elm",
        14,"Larch",
        15,"Small-leaved lime",
        16,"Black spruce",
        17,"Willow",
        18,"Rowan",
        19,"Fir",
        20,"Goat willow",
        21,"Ash",
        22,"Swiss pine",
        23,"Serbian spruce",
        24,"Oak",
        25,"Bird cherry",
        26,"Maple",
        27,"Curly birch",
        28,"Scots elm",
        29,"Deciduous tree",
        30,"Coniferous tree",
        "Unknown",
    ]
    addLayer({
        'id': 'metsaan-stand-mature-sym',
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
                        "concat",
                        "Main species: ",treeSpeciesText(["get", "maintreespecies"]),
                        "\navg.age: ",["get", "meanage"],
                        "\navg.diameter: ",["get", "meandiameter"]," cm",
                    ],
        }
    })

    addSource('metsaan-stand-mature-raster', {
        "type": "raster",
        'tiles': ['https://map.buttonprogram.org/stand2-mature/{z}/{x}/{y}.png'],
        'tileSize': 512,
        "maxzoom": 12,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
    });

    addLayer({
        'id': 'metsaan-stand-mature-raster',
        'source': 'metsaan-stand-mature-raster',
        'type': 'raster',
        'minzoom': 0,
        'maxzoom': 12,
    })



    const no2Tileset = Number.parseInt(window.location.search.substring(1)) || 0
    const timestampHour = Math.round(+new Date() / 1e6)
    addSource('no2-tiles', {
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
        addSource(sourceName, {
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
        addSource(sourceName, {
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
    addSource('hsy-solar-potential', {
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


    addSource('cifor-peatdepth', {
        "type": "raster",
        "tiles": ["https://map.buttonprogram.org/cifor/TROP-SUBTROP_PeatDepthV2_2016_CIFOR/{z}/{x}/{y}.png?v=3"],
        bounds: [-180, -60, 180, 40],
        "minzoom": 0,
        "maxzoom": 10,
        attribution: '<a href="https://www.cifor.org/">© Center for International Forestry Research (CIFOR)</a>',
    });
    addSource('cifor-wetlands', {
        "type": "raster",
        "tiles": ["https://map.buttonprogram.org/cifor/TROP-SUBTROP_WetlandV2_2016_CIFOR/{z}/{x}/{y}.png?v=3"],
        bounds: [-180, -60, 180, 40],
        "minzoom": 0,
        "maxzoom": 10,
        attribution: '<a href="https://www.cifor.org/">© Center for International Forestry Research (CIFOR)</a>',
    });
    addLayer({
        'id': 'cifor-peatdepth-raster',
        'source': 'cifor-peatdepth',
        'type': 'raster',
        paint: {
            'raster-opacity': 0.7,
        },
    })
    addLayer({
        'id': 'cifor-wetlands-raster',
        'source': 'cifor-wetlands',
        'type': 'raster',
        paint: {
            'raster-opacity': 0.7,
        },
    })



    addSource('gtk-mp20k-maalajit', {
        "type": "vector",
        "tiles": ["https://map.buttonprogram.org/mp20k_maalajit/{z}/{x}/{y}.pbf?v=2"],
        "minzoom": 0,
        "maxzoom": 12,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="http://www.gtk.fi/">© Geological Survey of Finland</a>',
    });
    addLayer({
        'id': 'gtk-mp20k-maalajit-fill',
        'source': 'gtk-mp20k-maalajit',
        'source-layer': 'mp20k_maalajit',
        'type': 'fill',
        'paint': {
            'fill-color': 'rgb(188, 167, 177)',
            'fill-opacity': fillOpacity,
        },
    })
    addLayer({
        'id': 'gtk-mp20k-maalajit-outline',
        'source': 'gtk-mp20k-maalajit',
        'source-layer': 'mp20k_maalajit',
        'type': 'line',
        "minzoom": 9,
        'paint': {
            'line-opacity': 0.5,
        }
    })
    addLayer({
        'id': 'gtk-mp20k-maalajit-sym',
        'source': 'gtk-mp20k-maalajit',
        'source-layer': 'mp20k_maalajit',
        'type': 'symbol',
        "minzoom": 14,
        "paint": {},
        "layout": {
            "text-size": 20,
            "symbol-placement": "point",
            "text-font": ["Open Sans Regular"],
            "text-field": [
                'case', ['==', ['get', 'pintamaalaji'], ['get', 'pohjamaalaji']],
                ['get', 'pintamaalaji'],
                [
                    'concat',
                    'topsoil: ', ['get', 'pintamaalaji'],
                    '\nsubsoil: ', ['get', 'pohjamaalaji'],
                ],
            ],
        }
    })


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
        "type": "raster",
        "tiles": [`https://tiles.waqi.info/tiles/${waqiAqi}/{z}/{x}/{y}.png?token=${process.env.WAQI_TOKEN}`],
        attribution: '<a href="https://www.cifor.org/">© The World Air Quality Project</a>',
    });
    addLayer({
        'id': 'waqi-raster',
        'source': 'waqi',
        'type': 'raster',
        paint: {
            'raster-opacity': 1.0,
        },
    });


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
                'rgb(109, 41, 7)',
                'rgb(188, 167, 177)',
            ],
            'fill-opacity': fillOpacity,
        },
    })
    addLayer({
        'id': 'gfw_tree_plantations-outline',
        'source': 'gfw_tree_plantations',
        'source-layer': 'gfw_plantations',
        'type': 'line',
        "minzoom": 9,
        'paint': {
            'line-opacity': 0.5,
        }
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
        }
    })

    map.on('click', 'gfw_tree_plantations-fill', e => {
        const f = e.features[0];
        const coordinates = getGeoJsonGeometryCenter(f.geometry.coordinates);
        const { image, spec_simp, type_text, area_ha, peat_ratio, avg_peatdepth } = f.properties;

        // Ensure that if the map is zoomed out such that multiple
        // copies of the feature are visible, the popup appears
        // over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
            coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        const images = image.replace(/\.(tif|img|_)/g, '').toUpperCase().split(/[,; ]+/);
        let results = '';
        images.forEach(x => {
            if (!/LGN\d/.test(x)) return;
            const base = x.replace(/LGN.*/, 'LGN0');
            // Most of the source images seem to fall in these categories.
            const candidates = [0,1,2].map(x => {
                results += `\n<li><a target="_blank" href="https://earthexplorer.usgs.gov/metadata/12864/${base+x}/">${base+x}</a></li>`;
            });
        })

        const peatInfo = peat_ratio < 0.4 ? '' : `<strong>Tropical peatland</strong><br/>\nAverage peat depth: ${avg_peatdepth.toFixed(1)} metres<br/>`;

        let html = `
            ${spec_simp}
            <br/>
            ${type_text}
            <br/>
            ${peatInfo}
            Area:${area_ha.toFixed(1)} hectares
            <br/>
            Landsat source ID: <code>${image}</code>
            <br/>
        `
        if (results) html += `Potential Landsat source images: <ul>${results}</ul>`;

        new mapboxgl.Popup()
        .setLngLat(coordinates)
        // Upstream X-Frame-Options prevents this iframe trick.
        // .setHTML(`<iframe sandbox src="https://earthexplorer.usgs.gov/metadata/12864/${image}/"></iframe>`)
        .setHTML(html)
        .addTo(map);
    });
    map.on('mouseenter', 'gfw_tree_plantations-fill', function () {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'gfw_tree_plantations-fill', function () {
        map.getCanvas().style.cursor = '';
    });





    const snowCoverLossDays = ['-', ["get", "avg_snow_cover_1980_1990"], ["get", "avg_snow_cover_1996_2016"]];
    addSource('snow_cover_loss', {
        "type": "vector",
        "tiles": ["https://map.buttonprogram.org/snow_cover_loss_2016/{z}/{x}/{y}.pbf"],
        "maxzoom": 3,
    });
    addLayer({
        'id': 'snow_cover_loss-fill',
        'source': 'snow_cover_loss',
        'source-layer': 'snow_cover_loss_1980_through_2016',
        'type': 'fill',
        'paint': {
            'fill-color': [
                'interpolate',
                ['linear'],
                snowCoverLossDays,
                0, 'rgb(255,255,255)',
                8, 'rgb(128,128,128)',
                15, 'rgb(252,113,34)', // orange
                21,'rgb(245,17,72)', // red
            ],
            'fill-opacity': fillOpacity,
        },
    })
    addLayer({
        'id': 'snow_cover_loss-sym',
        'source': 'snow_cover_loss',
        'source-layer': 'snow_cover_loss_1980_through_2016',
        'type': 'symbol',
        "minzoom": 10,
        "paint": {},
        "layout": {
            "text-size": 20,
            "symbol-placement": "point",
            "text-font": ["Open Sans Regular"],
            "text-field": [
                "concat",
                // "Snow cover lost per year: ", snowCoverLossDays,
                // "\n",
                "Days with snow (1980..1990): ", ["get", "avg_snow_cover_1980_1990"],
                "\n",
                "Days with snow (1996..2016): ", ["get", "avg_snow_cover_1996_2016"],
            ],
        }
    })


    addSource('corine_clc2018', {
        "type": "vector",
        "tiles": ["https://map.buttonprogram.org/corine_clc2018_subset/{z}/{x}/{y}.pbf.gz"],
        "maxzoom": 10,
    });
    addLayer({
        'id': 'corine_clc2018-fill',
        'source': 'corine_clc2018',
        'source-layer': 'Clc2018_FI20m_subset',
        'type': 'fill',
        // filter: ['any', ['==', ['get', 'dn'], 20], ['==', ['get', 'dn'], 22],  ['==', ['get', 'dn'], 19]],
        filter: ['!=', ['get', 'dn'], 255],
        'paint': {
            'fill-color': [
                "match",
                ["get", "dn"],
                17, 'yellow', // pellot
                18, 'red', // Hedelmäpuu- ja marjapensasviljelmät
                19, 'orange', //Laidunmaat
                20, 'green', //Luonnon laidunmaat
                21, 'teal', //Maataloustukijärjestelmän ulkopuoliset maatalousmaat
                22, 'maroon', //Puustoiset pelto- ja laidunmaat

                31, 'blue',
                32, 'purple',

                43, 'brown',
                44, 'black',

                'white',
            ],
            'fill-opacity': fillOpacity,
        },
    })
    addLayer({
        'id': 'corine_clc2018-outline',
        'source': 'corine_clc2018',
        'source-layer': 'Clc2018_FI20m_subset',
        'type': 'line',
        "minzoom": 6,
        'paint': {
            'line-opacity': 0.5,
        }
    })

    const corine2018ValueToLabel = v => [
        "match", v,
        1, "Continuous urban fabric",
        2, "Discontinuous urban fabric",
        3, "Commercial units",
        4, "Industrial units",
        5, "Road and rail networks and associated land",
        6, "Port areas",
        7, "Airports",
        8, "Mineral extraction sites",
        9, "Open cast mines",
        10, "Dump sites",
        11, "Construction sites",
        12, "Green urban areas",
        13, "Summer cottages",
        14, "Sport and leisure areas",
        15, "Golf courses",
        16, "Racecourses",
        17, "Non-irrigated arable land",
        18, "Fruit trees and berry plantations",
        19, "Pastures",
        20, "Natural pastures",
        21, "Arable land outside farming subsidies",
        22, "Agro-forestry areas",
        23, "Broad-leaved forest on mineral soil",
        24, "Broad-leaved forest on peatland",
        25, "Coniferous forest on mineral soil",
        26, "Coniferous forest on peatland",
        27, "Coniferous forest on rocky soil",
        28, "Mixed forest on mineral soil",
        29, "Mixed forest on peatland",
        30, "Mixed forest on rocky soil",
        31, "Natural grassland",
        32, "Moors and heathland ",
        33, "Transitional woodland/shrub  cc <10%  ",
        34, "Transitional woodland/shrub, cc 10-30%,on mineral soil",
        35, "Transitional woodland/shrub, cc 10-30%,  on peatland",
        36, "Transitional woodland/shrub, cc 10-30%,  on rocky soil",
        37, "Transitional woodland/shrub under power lines",
        38, "Beaches, dunes, and sand plains ",
        39, "Bare rock",
        40, "Sparsely vegetated areas",
        41, "Inland marshes, terrestrial",
        42, "Inland marshes, aquatic",
        43, "Peatbogs",
        44, "Peat production sites",
        45, "Salt marshes, terrestrial",
        46, "Salt marshes, aquatic",
        47, "Water courses",
        48, "Water bodies",
        49, "Sea and ocean",
        "",
    ]
    addLayer({
        'id': 'corine_clc2018-sym',
        'source': 'corine_clc2018',
        'source-layer': 'Clc2018_FI20m_subset',
        'type': 'symbol',
        "minzoom": 14,
        "paint": {},
        "layout": {
            "text-size": 20,
            "symbol-placement": "point",
            "text-font": ["Open Sans Regular"],
            "text-field": [
                'concat',
                corine2018ValueToLabel(['get', 'dn']),
                '\n', roundToSignificantDigits(2, ['*', 1e-4, ['get', 'st_area']]), ' ha',
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
    addSource('valio_fields', {
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

    setupPopupHandlerForMaviPeltolohko('valio-fields-fill');
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



// TODO: export pre-multiplied alpha colors:
// https://github.com/mapbox/mapbox-gl-native/issues/193#issuecomment-43077841
// > A color component can be from 0 to N where N is the alpha component of the color.
// > So a color like rgba(1, 1, 1, 0.5) turns into a premultiplied color of rgba(0.5, 0.5, 0.5, 0.5),
// > i.e. N is 0.5 here because alpha is 0.5.

window.exportLayerGroup = groupName => {
    const e = {"version": 8, "name": "export", sources:{}, layers:[]}
    e.layers = layerGroups[groupName]
        .filter(x => typeof x === 'string')
        .map(x => originalLayerDefs[x])
        .filter(x => x.type !== 'symbol')
        .filter(x => x.type !== 'raster')
        ;
    e.layers.forEach(({source}) => {
        e.sources[source] = originalSourceDefs[source];
    });

    console.log(JSON.stringify(e));
}
