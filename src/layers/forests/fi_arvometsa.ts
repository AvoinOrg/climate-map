import Chart from 'chart.js';
import { addLayer, addSource } from '../../layer_groups';
import { roundToSignificantDigits, replaceLayer, genericPopupHandler, assert, pp, createPopup } from '../../utils';
import { map } from '../../map';
import { setupPopupHandlerForMetsaanFiStandData } from './fi_forest_common';
import { Expression, Layer, MapLayerMouseEvent } from 'mapbox-gl';

const nC_to_CO2 = 44 / 12;

// const arvometsaAreaCO2eFillColor = expr => cetL9ColorMapStepExpr(-5, 15, expr);
const arvometsaAreaCO2eFillColor: (expr: Expression) => Expression = expr => [
    'interpolate',
    ['linear'],
    expr,
    -5, 'hsla(159, 100%, 75%, 1)',
    0, 'hsla(159, 100%, 50%, 1)',
    15, 'hsla(159, 100%, 25%, 1)',
];

addSource('arvometsa', {
    "type": "vector",
    "tiles": [`https://map.buttonprogram.org/arvometsa/{z}/{x}/{y}.pbf.gz?v=0`],
    "maxzoom": 14,
    bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
});

const arvometsaDatasetClasses = [
    'arvometsa_eihakata',
    'arvometsa_jatkuva',
    'arvometsa_alaharvennus',
    'arvometsa_ylaharvennus',
    'arvometsa_maxhakkuu',
];
const arvometsaDatasetTitles = [
    'No cuttings',
    'Continuous cover forestry',
    'Thin from below – clearfell',
    'Thin from above – extended rotation',
    'Removal of tree cover',
];
const ARVOMETSA_TRADITIONAL_FORESTRY_METHOD = 2; // Thin from below – clearfell

// Make sure the graphs are rendered the first time the layer is enabled.
const arvometsaInit = e => {
    replaceArvometsa();
    e.target.removeEventListener('change', arvometsaInit);
}
document.querySelector('input#arvometsa').addEventListener('change', arvometsaInit);

document.querySelectorAll('.arvometsa-projections > label > input').forEach(e => {
    e.addEventListener('change', ev => {
        arvometsaDataset = arvometsaDatasetClasses.indexOf((ev.target as HTMLInputElement).value);
        replaceArvometsa();
    })
});

document.querySelectorAll('.arvometsa li span').forEach(e => {
    const classes = [...e.parentElement.parentElement.classList];
    const attr = classes.filter(x => /arvometsa-/.test(x))[0].split(/-/)[1];
    const years = e.textContent.trim();
    const suffix = years === 'Now' ? '0' : years[0];
    e.addEventListener('click', () => {
        // window.arvometsaAttr = attr + suffix;
        replaceArvometsa();
    })
})

const arvometsaSumMethodAttrs: (method: number | Expression, attrPrefix: string) => Expression
    = (method, attrPrefix) => [
        'let', 'p', ['concat', 'm', method, '_'], [
            '*', 1 / 50, [
                '+',
                ['get', ['concat', ['var', 'p'], `${attrPrefix}1`]],
                ['get', ['concat', ['var', 'p'], `${attrPrefix}2`]],
                ['get', ['concat', ['var', 'p'], `${attrPrefix}3`]],
                ['get', ['concat', ['var', 'p'], `${attrPrefix}4`]],
                ['get', ['concat', ['var', 'p'], `${attrPrefix}5`]],
            ],
        ],
    ];

const arvometsaBestMethodCumulativeSumCbt = arvometsaSumMethodAttrs(['get', 'best_method'], 'cbt');
const arvometsaBestMethodVsOther: (method: number | Expression, attrPrefix: string) => Expression
    = (method, attrPrefix) => [
        '-',
        arvometsaSumMethodAttrs(method, attrPrefix),
        arvometsaSumMethodAttrs(ARVOMETSA_TRADITIONAL_FORESTRY_METHOD, attrPrefix),
    ];

const pickedRelativeMethod: Expression = ['get', 'best_method'];
const arvometsaRelativeCO2eValueExpr: Expression = arvometsaBestMethodVsOther(pickedRelativeMethod, 'cbt');

// const arvometsaRelativeCO2eFillColor = expr => fireColorMapStepExpr(0, 50 / nC_to_CO2, expr);

const arvometsaRelativeCO2eFillColor = expr => [
    'interpolate',
    ['linear'],
    expr,
    0, 'hsla(159, 100%, 25%, 1)',
    50 / nC_to_CO2, 'hsla(159, 100%, 50%, 1)',
];

addLayer({
    'id': 'arvometsa-actionable-relative-fill',
    // 'minzoom': 10,
    'source': 'arvometsa',
    'source-layer': 'default',
    'type': 'fill',
    'paint': {
        'fill-color': [
            'case', ['has', 'm0_cbt1'],
            arvometsaRelativeCO2eFillColor(arvometsaRelativeCO2eValueExpr),
            'black',
        ],
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'arvometsa-actionable-relative-sym',
    'source': 'arvometsa',
    'source-layer': 'default',
    'type': 'symbol',
    "minzoom": 15.5,
    paint: {
        "text-color": "#000",
    },
    "layout": {
        "text-size": 20,
        "symbol-placement": "point",
        "text-font": ["Open Sans Regular"],
        "text-field": [
            "case", ["has", 'm0_cbt1'], [
                "concat",
                "stand CO2e: ",
                roundToSignificantDigits(2, ['*', ['get', 'area'], arvometsaRelativeCO2eValueExpr]) as Expression,
                " t/y",
                [
                    'case', ['>', 0, arvometsaRelativeCO2eValueExpr],
                    '\n(net carbon source)',
                    '',
                ],
            ], "",
        ],
    },
    BEFORE: 'LABEL',
})

// window.arvometsaAttr = 'DEFAULT';
let arvometsaDataset = -1; // Best method [No cuttings]
let arvometsaInterval = null;

const arvometsaCumulativeCO2eValueExpr = arvometsaBestMethodCumulativeSumCbt;

// Keep saved features separate from anything related to rendering and data loading.
let arvometsaSavedFeatures = {};

addLayer({
    'id': 'arvometsa-fill',
    'source': 'arvometsa',
    'source-layer': 'default',
    'type': 'fill',
    'paint': {
        'fill-color': arvometsaAreaCO2eFillColor(arvometsaCumulativeCO2eValueExpr),
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'arvometsa-boundary',
    'minzoom': 12,
    'source': 'arvometsa',
    'source-layer': 'default',
    'type': 'line',
    'paint': {
        'line-opacity': 0.5,
    },
    BEFORE: 'OUTLINE',
})
// Dummy initial symbol layer to prevent warnings:
addLayer({
    'id': 'arvometsa-sym',
    'source': 'arvometsa',
    'source-layer': 'default',
    'type': 'symbol',
    BEFORE: 'LABEL',
})

const arvometsaHighlighted: Layer = {
    'id': 'arvometsa-highlighted',
    "type": 'fill',
    "source": "arvometsa",
    "source-layer": "default",
    "paint": {
        "fill-outline-color": "#484896",
        "fill-color": "#6e599f",
        "fill-opacity": 0.75
    },
    "filter": ["in", "standid"],
    BEFORE: 'OUTLINE',
}
addLayer(arvometsaHighlighted)

map.on('click', 'arvometsa-fill', function(e) {
    const selectedEnabled = (document.querySelector('#arvometsa-toggle-forest-parcel-select') as HTMLInputElement).checked
    if (!selectedEnabled) { return; }

    // Toggle select features +-5 pixels around the clicked point.
    const bbox = [[e.point.x - 5, e.point.y - 5], [e.point.x + 5, e.point.y + 5]];
    // @ts-ignore TODO
    const features = map.queryRenderedFeatures(bbox, { layers: ['arvometsa-fill'] });

    const ids = features.map(f => f.properties.standid);

    const curFilter = map.getFilter("arvometsa-highlighted").slice(2)
    const newFilter = ['in', 'standid']
        .concat(curFilter.filter(id => ids.indexOf(id) === -1))
        .concat(ids.filter(id => curFilter.indexOf(id) === -1))

    map.setFilter("arvometsa-highlighted", newFilter);
    // Save new features
    for (const feature of features) {
        arvometsaSavedFeatures[feature.properties.standid] = feature.properties;
    }
    // Only copy over currently selected features:
    const newFeatures = {}
    for (const id of newFilter.slice(2)) {
        newFeatures[id] = arvometsaSavedFeatures[id];
    }

    // Replace the graphs immediately:
    arvometsaSavedFeatures = newFeatures;
    arvometsaManualUpdateGraphs();
});

const baseAttrs = `
cbf1 cbf2 cbf3 cbf4 cbf5
cbt1 cbt2 cbt3 cbt4 cbt5
bio0 bio1 bio2 bio3 bio4 bio5
maa0 maa1 maa2 maa3 maa4 maa5
npv2 npv3 npv4
`.trim();

const abbrTitles = {
    cbf: 'Forest CO2e balance (trees + soil)',
    cbt: 'Forestry CO2e balance (trees + soil + products)',
    bio: 'Carbon stock in trees',
    maa: 'Carbon stock in soil',
    npv: 'Net present value of wood production (3% discounting)',
}

const harvestedWoodAttrs = [
    [0, 1, 2, 3, 4].map(x => `kasittely_${x}_tukki`).join(' '),
    [0, 1, 2, 3, 4].map(x => `kasittely_${x}_kuitu`).join(' '),
]

const setupArvometsaPopupHandler = () => {

    // TODO: maybe make the popup respond to global controls
    genericPopupHandler(['arvometsa-fill'], (ev) => {
        const selectorEnabled = (document.querySelector('#arvometsa-toggle-forest-parcel-select') as HTMLInputElement).checked
        if (selectorEnabled) { return; }

        const f = ev.features[0];
        const p = f.properties;
        const carbonStockAttrPrefixes = ['bio', 'maa'];
        const cumulativeFlag = (document.getElementById('arvometsa-cumulative') as HTMLInputElement).checked;

        function getUnit(prefix: string) {
            if (prefix === 'harvested-wood') {
                return 'm³';
            } else if (carbonStockAttrPrefixes.indexOf(prefix) !== -1) {
                return 'tons carbon';
            } else if (isCumulative(prefix)) {
                return 'tons CO2e';
            } else {
                return 'tons CO2e/y';
            }
        }
        function isCumulative(prefix: string) {
            // carbon stock is not counted cumulatively.
            const isCarbonStock = carbonStockAttrPrefixes.indexOf(prefix) !== -1;
            return cumulativeFlag && !isCarbonStock
        }

        // Keep Typescript happy:
        const attrValues = { cbf: -1, cbt: -1, bio: -1, maa: -1, tukki: -1, kuitu: -1 };

        let npv;
        const attrGroups = baseAttrs.split('\n').concat(harvestedWoodAttrs);
        const m = arvometsaDataset === -1 ? p.best_method : arvometsaDataset;
        const mAlt = ARVOMETSA_TRADITIONAL_FORESTRY_METHOD;

        const co2eBalance = [1, 2, 3, 4, 5].map(x => p[`m${m}_cbt${x}`]).reduce((x, y) => x + y, 0);
        const co2eBalanceAlt = [1, 2, 3, 4, 5].map(x => p[`m${mAlt}_cbt${x}`]).reduce((x, y) => x + y, 0);

        const years = 50;
        const co2eDiff = (co2eBalance - co2eBalanceAlt) / years;
        const co2eStr = `${pp(p.area * co2eDiff)} tons CO2e/y <small>or ${pp(co2eDiff)} tons CO2e/ha/y</small>`;
        const co2eBalanceStr = `${pp(p.area * co2eBalance / years)} tons CO2e/y <small>or ${pp(co2eBalance / years)} tons CO2e/ha/y</small>`;

        attrGroups.forEach(attrGroup => {
            const prefix = (
                attrGroup.indexOf('kasittely') !== -1
                    ? attrGroup.trim().split(/[_ ]/)[2]
                    : attrGroup.trim().slice(0, 3)
            );
            const attrs = attrGroup.trim().split(/ /).map(attr => `m${m}_${attr}`);

            if (prefix === 'npv') {
                // NPV does not really apply for CBF i.e. "no cuttings"
                const value = arvometsaDataset === 0 ? null : p[`m${m}_npv3`];
                npv = value === 0 || value ? `${pp(value)} €` : '-';
                return;
            }

            const attrV = [];
            for (const attr of attrs) {
                const prev = isCumulative(prefix) && attrV.length > 0 ? attrV[attrV.length - 1] : 0;
                attrV.push(prev + p[attr]);
            }
            attrValues[prefix] = attrV;
        });

        let html = `
        <strong>Forest parcel</strong><br/>
        Area: ${pp(p.area, 3)} hectares<br/>
        Net present value of wood production: ${npv}<br/>
        <strong>Shown:</strong> ${cumulativeFlag ? 'Cumulative carbon balance' : 'Incremental carbon balance per decade'}<br/>

        <strong>Potential CO2e savings with ${arvometsaDatasetTitles[m]}:</strong> ${co2eStr}<br/>
        <strong>Forestry CO2 balance with ${arvometsaDatasetTitles[m]}:</strong> ${co2eBalanceStr}<br/>
        `;

        const chartTitles = {
            cbf: 'Forest CO2e balance (trees + soil)',
            cbt: 'Forestry CO2e balance (trees + soil + products)',
            bio: 'Forest carbon stock (trees + soil)',
            'harvested-wood': 'Harvested wood (m<sup>3</sup>)',
        }
        for (const prefix of ['cbf', 'cbt', 'bio', 'harvested-wood']) {
            assert(prefix in chartTitles, `Missing message for: ${prefix}`);
            html += `
            <strong>${chartTitles[prefix]}</strong>
            <canvas class="arvometsa-popup-${prefix}"></canvas><br/>
            `;
        }
        const popup = createPopup(ev, html, { maxWidth: '360px' });
        // @ts-ignore TODO
        const popupElem = popup._content;

        for (const prefix of ['cbf', 'cbt', 'bio', 'harvested-wood']) {
            let datasets;
            const unit = getUnit(prefix);
            const stacked = true;
            switch (prefix) {
                case 'cbf':
                    datasets = [{
                        label: 'CO2e balance',
                        backgroundColor: 'green',
                        data: attrValues.cbf,
                    }];
                    break;
                case 'cbt':
                    datasets = [{
                        label: 'CO2e balance',
                        backgroundColor: 'rgb(63, 90, 0)',
                        data: attrValues.cbt,
                    }];
                    break;
                case 'bio':
                    datasets = [{
                        label: 'Soil',
                        backgroundColor: '#815f1c',
                        data: attrValues.maa,
                    }, {
                        label: 'Trees',
                        backgroundColor: '#00af5a',
                        data: attrValues.bio,
                    }];
                    break;
                case 'harvested-wood':
                    datasets = [{
                        label: 'Sawlog',
                        backgroundColor: 'brown',
                        data: attrValues.tukki,
                    }, {
                        label: 'Pulpwood',
                        backgroundColor: 'green',
                        data: attrValues.kuitu,
                    }];
                    break;
            }

            const labels = {
                'cbf': ['10', '20', '30', '40', '50'],
                'cbt': ['10', '20', '30', '40', '50'],
                'bio': ['0', '10', '20', '30', '40', '50'],
                'harvested-wood': ['10', '20', '30', '40', '50'],
            }

            const outputElem = popupElem.querySelector(`canvas.arvometsa-popup-${prefix}`);

            const chart = null; // arvometsaGraphs[prefix];
            const labelCallback = function(tooltipItem, data) {
                const label = data.datasets[tooltipItem.datasetIndex].label;
                const v = pp(tooltipItem.yLabel, 2);
                return `${label}: ${v} ${unit}`;
            };
            if (chart) {
                let changed = chart.options.arvometsaCumulative !== isCumulative(prefix);
                chart.data.datasets.forEach((dataset, i) => {
                    changed = changed || JSON.stringify(dataset.data) !== JSON.stringify(datasets[i].data);
                    dataset.data = datasets[i].data;
                });
                chart.options.arvometsaCumulative = isCumulative(prefix);
                chart.options.tooltips.callbacks.label = labelCallback;
                if (changed) {
                    chart.update();
                }
            } else {
                const options = {
                    arvometsaCumulative: isCumulative(prefix),
                    animation: { duration: 0 },
                    scales: {
                        xAxes: [{
                            stacked,
                            scaleLabel: { display: true, labelString: 'years from now' },
                        }],
                        yAxes: [{
                            stacked,
                            ticks: {
                                beginAtZero: true,
                                callback: (value, _index, _values) => value.toLocaleString(),
                            },
                        }],
                    },
                    tooltips: {
                        callbacks: { label: labelCallback },
                    },
                };
                new Chart(outputElem, {
                    type: 'bar',
                    data: { labels: labels[prefix], datasets },
                    options,
                });
            }
        }
    })
}

let arvometsaManualUpdateGraphs = () => { }; // Replaced by another function

const arvometsaGraphs = {};
const replaceArvometsa = () => {
    // Ensure the UI state is consistent with the activation of this:
    (document.querySelector('input#arvometsa') as HTMLInputElement).checked = true;

    // const attr = window.arvometsaAttr;
    // const dataset = arvometsaDataset;
    // const mAttr = `m${dataset}_${attr}`

    if (arvometsaInterval !== null) {
        window.clearInterval(arvometsaInterval);
    }

    setupArvometsaPopupHandler();

    const co2eValueExpr = (
        arvometsaDataset === -1
            ? arvometsaBestMethodCumulativeSumCbt
            : arvometsaSumMethodAttrs(arvometsaDataset, 'cbt')
    );

    // attr like 'cbt1', 'cbt2', 'bio0', 'maa0'
    const fillLayer: Layer = {
        'id': 'arvometsa-fill',
        'source': 'arvometsa',
        'source-layer': 'default',
        'type': 'fill',
        'paint': {
            'fill-color': arvometsaAreaCO2eFillColor(co2eValueExpr),
        },
        BEFORE: 'FILL',
    };
    replaceLayer(fillLayer);

    const symLayer: Layer = {
        'id': 'arvometsa-sym',
        'source': 'arvometsa',
        'source-layer': 'default',
        'type': 'symbol',
        "minzoom": 15.5,
        // 'maxzoom': zoomThreshold,
        "paint": {},
        "layout": {
            "text-size": 20,
            "symbol-placement": "point",
            "text-font": ["Open Sans Regular"],
            "text-field": [
                "case", ["has", 'm0_cbt1'], [
                    "concat",
                    "stand CO2e: ",
                    roundToSignificantDigits(2, ['*', ['get', 'area'], co2eValueExpr]),
                    " t/y",
                    [
                        'case', ['>', 0, ['*', ['get', 'area'], co2eValueExpr]],
                        '\n(net carbon source)',
                        '',
                    ],
                ], "",
            ],
        },
        BEFORE: 'LABEL',
    };
    replaceLayer(symLayer);

    function sleep(time: number) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    const getArvometsaFunctionalDependencies = () => {
        const bounds = map.getBounds();
        const cumulativeFlag = ( document.getElementById('arvometsa-cumulative') as HTMLInputElement).checked;
        // @ts-ignore TODO
        const numFeatures = map.queryRenderedFeatures({ layers: ['arvometsa-fill'] }).length;
        return [bounds.getNorth(), bounds.getSouth(), bounds.getEast(), bounds.getWest(), arvometsaDataset, cumulativeFlag, numFeatures];
    }
    const getArvometsaFunctionalDependenciesForSelectedParcels = () => {
        const cumulativeFlag = (document.getElementById('arvometsa-cumulative') as HTMLInputElement).checked;
        const selectedFeatures: any[] = Object.keys(arvometsaSavedFeatures);
        return [arvometsaDataset, cumulativeFlag].concat(selectedFeatures);
    }
    let arvometsaPrevState = [];
    const updateGraphs = () => {
        const selectorEnabled = (document.querySelector('#arvometsa-toggle-forest-parcel-select') as HTMLInputElement).checked

        const newState = selectorEnabled
            ? getArvometsaFunctionalDependenciesForSelectedParcels()
            : getArvometsaFunctionalDependencies();

        const allSame =
            arvometsaPrevState.length === newState.length &&
            arvometsaPrevState.map((x, i) => x === newState[i]).reduce((a, b) => a && b, true);

        if (allSame) { return; } // nothing to do

        arvometsaPrevState = newState;

        const dataset = arvometsaDataset;
        const totals = { area: 0 };
        (harvestedWoodAttrs.join(' ') + ' ' + baseAttrs).split(/\s+/).forEach(attr => {
            const mAttr = `m${dataset}_${attr}`;
            totals[mAttr] = 0;
        });

        const reMatchAttr = /m-?\d_(.*)/;
        const props = selectorEnabled
            ? Object.values(arvometsaSavedFeatures)
            // @ts-ignore TODO
            : map.queryRenderedFeatures({ "layers": ['arvometsa-fill'] }).map(x => x.properties);

        props.forEach(p => {
            if (p.m0_cbt1 === null || p.m0_cbt1 === undefined) { return; }
            if (!p.area) { return; } // hypothetical
            totals.area += p.area;
            if (dataset === -1) {
                for (const a in totals) {
                    if (a === 'area') continue;
                    const attr = `m${p.best_method}_${reMatchAttr.exec(a)[1]}`;
                    if (!(attr in p)) {
                        console.error('Invalid attr:', attr, 'orig:', a, 'props:', p)
                    }
                    totals[a] += p[attr] * p.area;
                }
                return;
            }
            for (const a in totals) {
                if (a in p && a !== 'area') totals[a] += p[a] * p.area;
            }
        });

        const carbonStockAttrPrefixes = ['bio', 'maa'];
        const cumulativeFlag = ( document.getElementById('arvometsa-cumulative') as HTMLInputElement).checked;

        function getUnit(prefix: string) {
            if (prefix === 'harvested-wood') {
                return 'm³';
            } else if (carbonStockAttrPrefixes.indexOf(prefix) !== -1) {
                return 'tons carbon';
            } else if (isCumulative(prefix)) {
                return 'tons CO2e';
            } else {
                return 'tons CO2e/y';
            }
        }
        function isCumulative(prefix: string) {
            // carbon stock is not counted cumulatively.
            const isCarbonStock = carbonStockAttrPrefixes.indexOf(prefix) !== -1;
            return cumulativeFlag && !isCarbonStock
        }

        // Keep Typescript happy:
        const attrValues = { cbf: -1, cbt: -1, bio: -1, maa: -1, tukki: -1, kuitu: -1 };

        const attrGroups = baseAttrs.split('\n').concat(harvestedWoodAttrs);
        attrGroups.forEach(attrGroup => {
            const prefix = (
                attrGroup.indexOf('kasittely') !== -1
                    ? attrGroup.trim().split(/[_ ]/)[2]
                    : attrGroup.trim().slice(0, 3)
            );
            const attrs = attrGroup.trim().split(/ /).map(attr => `m${dataset}_${attr}`);

            if (prefix === 'npv') {
                const outputElem = document.querySelector(`output.arvometsa-npv`) as HTMLElement;
                // NPV does not really apply for CBF i.e. "no cuttings"
                const value = dataset === 0 ? null : totals[`m${dataset}_npv3`];
                const out = value === 0 || value ? `${pp(value)} €` : '-';
                if (outputElem.getAttribute('data-source-html') !== out) {
                    outputElem.setAttribute('data-source-html', out);
                    outputElem.innerHTML = out;
                }
                return;
            }

            const attrV = [];
            for (const attr of attrs) {
                const prev = isCumulative(prefix) && attrV.length > 0 ? attrV[attrV.length - 1] : 0;
                attrV.push(prev + totals[attr]);
            }
            attrValues[prefix] = attrV;
        });

        for (const prefix of ['cbf', 'cbt', 'bio', 'harvested-wood']) {
            let datasets;
            const unit = getUnit(prefix);
            const stacked = true;
            switch (prefix) {
                case 'cbf':
                    datasets = [{
                        label: 'CO2e balance',
                        backgroundColor: 'green',
                        data: attrValues.cbf,
                    }];
                    break;
                case 'cbt':
                    datasets = [{
                        label: 'CO2e balance',
                        backgroundColor: 'rgb(63, 90, 0)',
                        data: attrValues.cbt,
                    }];
                    break;
                case 'bio':
                    datasets = [{
                        label: 'Soil',
                        backgroundColor: '#815f1c',
                        data: attrValues.maa,
                    }, {
                        label: 'Trees',
                        backgroundColor: '#00af5a',
                        data: attrValues.bio,
                    }];
                    break;
                case 'harvested-wood':
                    datasets = [{
                        label: 'Sawlog',
                        backgroundColor: 'brown',
                        data: attrValues.tukki,
                    }, {
                        label: 'Pulpwood',
                        backgroundColor: 'green',
                        data: attrValues.kuitu,
                    }];
                    break;
            }

            const labels = {
                'cbf': ['10', '20', '30', '40', '50'],
                'cbt': ['10', '20', '30', '40', '50'],
                'bio': ['0', '10', '20', '30', '40', '50'],
                'harvested-wood': ['10', '20', '30', '40', '50'],
            }

            const outputElem = document.querySelector(`canvas.arvometsa-${prefix}`);

            const chart = arvometsaGraphs[prefix];
            const labelCallback = function(tooltipItem, data) {
                const label = data.datasets[tooltipItem.datasetIndex].label;
                const v = pp(tooltipItem.yLabel, 2);
                return `${label}: ${v} ${unit}`;
            };
            if (chart) {
                let changed = chart.options.arvometsaCumulative !== isCumulative(prefix);
                chart.data.datasets.forEach((ds, i: number) => {
                    changed = changed || JSON.stringify(ds.data) !== JSON.stringify(datasets[i].data);
                    ds.data = datasets[i].data;
                });
                chart.options.arvometsaCumulative = isCumulative(prefix);
                chart.options.tooltips.callbacks.label = labelCallback;
                if (changed) {
                    chart.update();
                }
            } else {
                const options = {
                    arvometsaCumulative: isCumulative(prefix),
                    animation: { duration: 0 },
                    scales: {
                        xAxes: [{
                            stacked,
                            scaleLabel: { display: true, labelString: 'years from now' },
                        }],
                        yAxes: [{
                            stacked,
                            ticks: {
                                beginAtZero: true,
                                callback: (value, _index, _values) => value.toLocaleString(),
                            },
                        }],
                    },
                    tooltips: {
                        callbacks: { label: labelCallback },
                    },
                };
                arvometsaGraphs[prefix] = new Chart(outputElem, {
                    type: 'bar',
                    data: { labels: labels[prefix], datasets },
                    options,
                });
            }
        }

        const totalArea = `${pp(totals.area, 3)} hectares`;
        const areaElem = document.querySelector(`output.arvometsa-area`);
        if (areaElem.getAttribute('data-source-html') !== totalArea) {
            areaElem.setAttribute('data-source-html', totalArea);
            areaElem.innerHTML = totalArea;
        }
    }

    arvometsaInterval = window.setInterval(updateGraphs, 1000);
    // Need to sleep a little first;
    // to allow mapbox GL to compute something first? Maybe it's a bug.
    sleep(200).then(updateGraphs);
    arvometsaManualUpdateGraphs = updateGraphs;
};

addSource('arvometsa-actionable-relative-raster', {
    "type": 'raster',
    'tiles': ['https://map.buttonprogram.org/arvometsa/{z}/{x}/{y}.png?v=0'],
    'tileSize': 512,
    "maxzoom": 13,
    bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
});

addLayer({
    'id': 'arvometsa-actionable-relative-raster',
    'source': 'arvometsa-actionable-relative-raster',
    'type': 'raster',
    'minzoom': 0,
    'maxzoom': 13,
    BEFORE: 'FILL',
});

setupPopupHandlerForMetsaanFiStandData('arvometsa-actionable-relative-fill');
