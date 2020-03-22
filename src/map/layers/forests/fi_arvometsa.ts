import { Chart } from 'chart.js';
import { Expression, MapboxGeoJSONFeature } from 'mapbox-gl';
import { roundToSignificantDigits, assert, pp, fillOpacity, getGeoJsonGeometryBounds } from '../../utils';
import { addLayer, addSource, setPaintProperty, setLayoutProperty, setFilter, querySourceFeatures, fitBounds, genericPopupHandler } from '../../map';


interface ILayerOption { minzoom: number, maxzoom?: number, id: string }
interface ILayerOptions { [s: string]: ILayerOption }
const layerOptions: ILayerOptions = {
    'arvometsa': { minzoom: 14, id: 'standid' },
    'arvometsa-property': { minzoom: 12, maxzoom: 14, id: 'localid' },
    'arvometsa-municipality': { minzoom: 7.5, maxzoom: 12, id: 'localid' },
    'arvometsa-region': { minzoom: 5.5, maxzoom: 7.5, id: 'localid' },
    'arvometsa-regional-state': { minzoom: 4, maxzoom: 5.5, id: 'localid' },
    'arvometsa-country': { minzoom: 0, maxzoom: 4, id: 'localid' },
}

// In theory, we could display just the properties as MVT,
// but Mapbox-GL is too buggy so it's more reliable to also have munis as MVT.
// const mvtLayers = ['arvometsa', 'arvometsa-property', 'arvometsa-municipality'];

// geojson fetch not yet implemented:
const mvtLayers = Object.keys(layerOptions);

const nC_to_CO2 = 44 / 12;

// Hue 54..159, saturation 57..4
const colorboxStepsNeg = [
    '#FFEC42',
    '#FDF259',
    '#FCF670',
    '#F0F596',
]

const stepsToLinear = (min, max, steps) => {
    const step = (max-min)/(steps.length - 1);
    const res = [];
    let cur = min;
    for (const s of steps) {
        res.push(cur);
        res.push(s);
        cur += step;
    }
    return res;
}

// const arvometsaAreaCO2eFillColor = expr => cetL9ColorMapStepExpr(-5, 15, expr);
const arvometsaAreaCO2eFillColor: (expr: Expression) => Expression = expr => [
    'interpolate',
    ['linear'],
    expr,
    ...(
        stepsToLinear(-5, 0, colorboxStepsNeg)
        .concat([
            0.01, 'hsla(159, 100%, 50%, 1)',
            15, 'hsla(159, 100%, 25%, 1)',
        ])
    ),
];

addSource('arvometsa', {
    "type": "vector",
    "tiles": [`https://map.buttonprogram.org/arvometsa/{z}/{x}/{y}.pbf.gz?v=0`],
    minzoom: 13,
    "maxzoom": 14,
    bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
});

const sources = {
    property: 'agg_palstat',
    municipality: 'agg_kunnat',
    region: 'agg_regions',
    'regional-state': 'agg_regional_states',
    country: 'agg_fi'
}

for (const [source,path] of Object.entries(sources)) {
    const sourceName = `arvometsa-${source}`
    const opts = layerOptions[sourceName];
    const sourceOpts = mvtLayers.indexOf(sourceName) !== -1
        ? {
            "type": "vector",
            "tiles": [`https://map.buttonprogram.org/arvometsa/${path}/tiles/{z}/{x}/{y}.pbf.gz?v=2`],
            minzoom: 0, // Math.floor(opts.minzoom), // minzoom 0 for all is useful for highlights!
            maxzoom: Math.ceil(opts.maxzoom!),
            bounds: [19, 59, 32, 71], // Finland
        } : {
            "type": "geojson",
            "data": `https://map.buttonprogram.org/arvometsa/${path}.geojson.gz?v=0`,
        };
    // @ts-ignore
    addSource(sourceName, {
        attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
        ...sourceOpts,
    });
}

const arvometsaDatasetClasses = [
    'arvometsa_eihakata',
    'arvometsa_jatkuva',
    'arvometsa_alaharvennus',
    'arvometsa_ylaharvennus',
    'arvometsa_maxhakkuu',
];
const BEST_METHOD_FOR_EACH = -1;
const ARVOMETSA_TRADITIONAL_FORESTRY_METHOD = 2; // Thin from below – clearfell


const updateGraphs = (f?: MapboxGeoJSONFeature) => {
    const scenarioInputElem = document.querySelector('.arvometsa-projections :checked') as HTMLInputElement;
    if (!scenarioInputElem) {
        return
    }
    arvometsaDataset = arvometsaDatasetClasses.indexOf(scenarioInputElem.value);

    // Ensure the UI state is consistent with the activation of this:
    if (selectedFeature) {
        const inputArvometsa = document.querySelector('input#arvometsa') as HTMLInputElement
        if (!inputArvometsa) {
            return
        }
        inputArvometsa.checked = true;
    }

    updateDetailVisibility();

    const cumulativeFlag = (document.getElementById('arvometsa-cumulative') as HTMLInputElement).checked;
    const perHectareFlag = (document.getElementById('arvometsa-per-hectare') as HTMLInputElement).checked;
    const carbonBalanceDifferenceFlag = (document.getElementById('arvometsa-carbon-balance-difference') as HTMLInputElement).checked;

    const co2eValueExpr = (
        arvometsaDataset === BEST_METHOD_FOR_EACH
            ? arvometsaBestMethodCumulativeSumCbt
            : arvometsaSumMethodAttrs(arvometsaDataset, 'cbt')
    );

    const arvometsaRelativeCO2eValueExpr = arvometsaBestMethodVsOther(arvometsaDataset, 'cbt');

    const fillColor = carbonBalanceDifferenceFlag
        ? arvometsaAreaCO2eFillColor(arvometsaRelativeCO2eValueExpr)
        : arvometsaAreaCO2eFillColor(co2eValueExpr);

    for (const type of Object.keys(layerOptions)) {
        setPaintProperty(`${type}-fill`, 'fill-color', fillColor);
    }

    setLayoutProperty('arvometsa-sym', 'text-field', arvometsaTextfieldExpression(co2eValueExpr));

    if (!selectedFeature) return;

    const dataset = arvometsaDataset;
    const totals = { area: 0, st_area: 0 };
    const totalBaseAttrs = (harvestedWoodAttrs.join(' ') + ' ' + baseAttrs).split(/\s+/);
    for (const dsNum of [dataset, ARVOMETSA_TRADITIONAL_FORESTRY_METHOD]) {
        for (const attr of totalBaseAttrs) {
            totals[`m${dsNum}_${attr}`] = 0;
        }
    }
    const areaProportionalAttrs =
        Object.keys(totals)
        .filter(x => x !== 'area' && x !== 'st_area');

    const reMatchAttr = /m-?\d_(.*)/;

    const props = [selectedFeature.properties];

    const seenIds = {};
    for (const p of props) {
        // Degenerate cases:
        if (p.m0_cbt1 === null || p.m0_cbt1 === undefined) { continue; }
        if (!p.area) { continue; } // hypothetical

        // Duplicates are possible, so we must only aggregate only once per ID:
        // @ts-ignore TODO
        const id = p.localid || p.standid;
        if (id in seenIds) { continue; }
        seenIds[id] = true;

        totals.area += p.area;
        totals.st_area += p.st_area || p.area;

        if (dataset === BEST_METHOD_FOR_EACH) {
            for (const a of areaProportionalAttrs) {
                const attr = `m${p.best_method}_${reMatchAttr.exec(a)[1]}`;
                if (!(attr in p)) {
                    console.error('Invalid attr:', attr, 'orig:', a, 'props:', p)
                }
                totals[a] += p[attr] * p.area;
            }
            continue;
        }

        for (const a of areaProportionalAttrs) {
            if (a in p) { totals[a] += p[a] * p.area; }
        }
    }

    const carbonStockAttrPrefixes = ['bio', 'maa'];

    if (perHectareFlag) {
        for (const a in totals) {
            if (a !== 'area' && a !== 'st_area') {
                totals[a] /= totals.area;
            }
        }
    }

    function isCumulative(prefix: string) {
        // carbon stock is not counted cumulatively.
        const isCarbonStock = carbonStockAttrPrefixes.indexOf(prefix) !== -1;
        return cumulativeFlag && !isCarbonStock;
    }
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

    const dsAs = {};
    const attrGroups = baseAttrs.split('\n').concat(harvestedWoodAttrs);
    for (const dsNum of [dataset, ARVOMETSA_TRADITIONAL_FORESTRY_METHOD]) {
        const dsAttrValues = {
            cbf: [], cbt: [], bio: [], maa: [], tukki: [], kuitu: [],
            productsCB: [], soilCB: [], treeCB: [],
        }
        dsAs[dsNum] = dsAttrValues;

        for (const attrGroup of attrGroups) {
            const prefix = (
                attrGroup.indexOf('kasittely') !== -1
                    ? attrGroup.trim().split(/[_ ]/)[2]
                    : attrGroup.trim().slice(0, 3)
            );
            const attrs = attrGroup.trim().split(/ /).map(attr => `m${dsNum}_${attr}`);
            if (prefix === 'npv') continue; // Cannot accumulate NPV values

            const attrV: number[] = [];
            for (const attr of attrs) {
                const prev = isCumulative(prefix) && attrV.length > 0 ? attrV[attrV.length - 1] : 0;
                attrV.push(prev + totals[attr]);
            }
            dsAttrValues[prefix] = attrV;
        }

        if (cumulativeFlag) {
            dsAttrValues.soilCB = dsAttrValues.maa.slice(1).map((v,_) => v - dsAttrValues.maa[0]);
        } else {
            dsAttrValues.soilCB = dsAttrValues.maa.slice(1).map((v,i) => v - dsAttrValues.maa[i]);
        }
        dsAttrValues.soilCB = dsAttrValues.soilCB.map(x => x * nC_to_CO2); // tons carbon -> tons CO2e approx TODO: verify

        dsAttrValues.productsCB = dsAttrValues.cbt.map((cbtValue, i) => cbtValue - dsAttrValues.cbf[i]);
        dsAttrValues.treeCB = dsAttrValues.cbf.map((cbfValue, i) => cbfValue - dsAttrValues.soilCB[i]);
    }

    const attrValues = dsAs[dataset];
    if (carbonBalanceDifferenceFlag) {
        const traditional = dsAs[ARVOMETSA_TRADITIONAL_FORESTRY_METHOD];
        for (const attr in attrValues) {
            attrValues[attr] = attrValues[attr].map((v: number, i: number) => v - traditional[attr][i]);
        }
    }

    // Set NPV:
    {
        const outputElem = document.querySelector(`output.arvometsa-npv`) as HTMLElement;
        // NPV does not really apply for CBF i.e. "no cuttings"
        const comparison = carbonBalanceDifferenceFlag ? totals[`m${ARVOMETSA_TRADITIONAL_FORESTRY_METHOD}_npv3`] : 0;
        const value = dataset === 0 ? null : totals[`m${dataset}_npv3`] - comparison;
        const out = value === 0 || value ? `${pp(value)} €${perHectareFlag ? ' per ha' : ''}` : '-';
        outputElem.textContent = out;
    }


    for (const prefix of ['cbt', 'bio', 'harvested-wood']) {
        let datasets;
        const unit = perHectareFlag ? `${getUnit(prefix)}/ha` : getUnit(prefix);
        const stacked = true;
        switch (prefix) {
            case 'cbt':
                datasets = [{
                    label: 'Soil',
                    backgroundColor: '#815f1c',
                    data: attrValues.soilCB,
                }, {
                    label: 'Trees',
                    backgroundColor: '#00af5a',
                    data: attrValues.treeCB,
                }, {
                    label: 'Products',
                    backgroundColor: 'brown',
                    data: attrValues.productsCB,
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

        const outputElem = document.querySelector(`canvas.arvometsa-${prefix}`) as HTMLCanvasElement;

        const chart: Chart = arvometsaGraphs[prefix];
        const labelCallback = function (tooltipItem: Chart.ChartTooltipItem, data: Chart.ChartData) {
            const label = data.datasets[tooltipItem.datasetIndex].label;
            const v = pp(+tooltipItem.yLabel, 2);
            return `${label}: ${v} ${unit}`;
        };
        if (chart) {
            chart.data.datasets.forEach((ds: Chart.ChartDataSets, i: number) => {
                ds.data = datasets[i].data;
            });
            chart.options.tooltips.callbacks.label = labelCallback;
            chart.update();
        } else {
            const options = {
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

    const p = props[0];
    assert(selectedFeatureLayer, "selectedFeatureLayer must be set");
    let title: string;
    if (selectedFeatureLayer === 'arvometsa-fill') {
        //@ts-ignore
        title = `Forest parcel (id:${p.standid})`;
    } else if (selectedFeatureLayer === 'arvometsa-property-fill') {
        //@ts-ignore
        title = `Property with forest (${p.tpteksti})`;
    } else {
        //@ts-ignore
        assert(p.name_fi, `Expected name_fi: ${selectedFeatureLayer}`)
        //@ts-ignore
        title = p.name_fi || p.name_sv; // `${p.name_fi} / ${p.name_sv}`;
    }

    document.getElementById('arvometsa-title').textContent = title;

    const forestArea = `${pp(totals.area, 3)} hectares`;
    document.querySelector(`output.arvometsa-area-forest`).textContent = forestArea;

    const totalArea = `${pp(1e-4 * totals.st_area, 3)} hectares`;
    document.querySelector(`output.arvometsa-area-total`).textContent = totalArea;
}


const arvometsaTextfieldExpression: (co2eValueExpr: Expression) => Expression = (co2eValueExpr) => [
    "case", ["has", 'm0_cbt1'], [
        "concat",
        roundToSignificantDigits(3, ['get', 'area']) as Expression,
        " ha\n",
        roundToSignificantDigits(2, co2eValueExpr) as Expression,
        " t CO2e/y/ha",
    ], "",
];


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


let arvometsaDataset = -1; // Best method [No cuttings]

const arvometsaCumulativeCO2eValueExpr = arvometsaBestMethodCumulativeSumCbt;

// Keep saved features separate from anything related to rendering and data loading.
let selectedFeature, selectedFeatureLayer, selectedFeatureBounds;

for (const [type, opts] of Object.entries(layerOptions)) {
    const extraOpts = mvtLayers.indexOf(type) === -1 ? {} : {"source-layer": "default"};
    addLayer({
        'id': `${type}-fill`,
        'source': type,
        'type': 'fill',
        'paint': {
            'fill-color': arvometsaAreaCO2eFillColor(arvometsaCumulativeCO2eValueExpr),
            'fill-opacity': ['arvometsa'].indexOf(type) === -1 ? fillOpacity : 1,
        },
        minzoom: opts.minzoom,
        maxzoom: opts.maxzoom || 24,
        BEFORE: 'FILL',
        ...extraOpts,
    });
    addLayer({
        'id': `${type}-boundary`,
        'source': type,
        'type': 'line',
        'paint': {
            'line-opacity': 0.5,
        },
        minzoom: opts.minzoom,
        maxzoom: opts.maxzoom || 24,
        BEFORE: 'OUTLINE',
        ...extraOpts,
    });

    addLayer({
        'id': `${type}-highlighted`,
        "source": type,
        "type": 'fill',
        "paint": {
            "fill-outline-color": "#484896",
            "fill-color": "#6e599f",
            "fill-opacity": 0.4
        },
        "filter": ["in", opts.id],
        BEFORE: 'OUTLINE',
        ...extraOpts,
    });
}



addLayer({
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
        "text-field": arvometsaTextfieldExpression(arvometsaCumulativeCO2eValueExpr),
    },
    BEFORE: 'LABEL',
})


const baseAttrs = `
cbf1 cbf2 cbf3 cbf4 cbf5
cbt1 cbt2 cbt3 cbt4 cbt5
bio0 bio1 bio2 bio3 bio4 bio5
maa0 maa1 maa2 maa3 maa4 maa5
npv2 npv3 npv4
`.trim();

const harvestedWoodAttrs = [
    [0, 1, 2, 3, 4].map(x => `kasittely_${x}_tukki`).join(' '),
    [0, 1, 2, 3, 4].map(x => `kasittely_${x}_kuitu`).join(' '),
]

const updateDetailVisibility = () => {
    if (selectedFeature) {
        document.querySelector('.arvometsa-output').removeAttribute('hidden');
        document.querySelector('.arvometsa-empty').setAttribute('hidden', 'hidden');
    } else {
        document.querySelector('.arvometsa-output').setAttribute('hidden', 'hidden');
        document.querySelector('.arvometsa-empty').removeAttribute('hidden');
    }
}
const clearHighlights = () => {
    for (const sourceName of Object.keys(layerOptions)) {
        const idName = layerOptions[sourceName].id;
        setFilter(`${sourceName}-highlighted`, ['in', idName]);
    }
    selectedFeature = selectedFeatureBounds = selectedFeatureLayer = null;
    updateDetailVisibility();
}

for (const sourceName of Object.keys(layerOptions)) {
    const layerName = `${sourceName}-fill`;
    // eslint-disable-next-line no-loop-func
    genericPopupHandler(layerName, (ev) => {
        const f = ev.features[0];

        // Only copy over currently selected features:
        const idName = layerOptions[sourceName].id;
        const id = f.properties[idName];
        assert(id, `Feature has no id: ${JSON.stringify(f.properties)}`);

        clearHighlights();
        const newFilter = ['in', idName, id];
        setFilter(`${sourceName}-highlighted`, newFilter);
        console.log(`${sourceName}-highlighted`, newFilter);

        selectedFeatureBounds = querySourceFeatures(sourceName, 'default')
        .filter(f => f.properties[idName] === id)
        .map(f => f.bbox || getGeoJsonGeometryBounds((f.geometry as any).coordinates))
        .reduce(
            ([a1,b1,c1,d1], [a2,b2,c2,d2]) => [
                Math.min(a1,a2), Math.min(b1,b2),
                Math.max(c1,c2), Math.max(d1,d2)
            ],
            [999,999,-999,-999]
        );

        selectedFeatureLayer = layerName;
        selectedFeature = f;
        updateGraphs(f);

        // Force the menu (the info box) to appear if it's hidden now:
        //@ts-ignore;
        if (document.getElementById('menu-container').hidden) { window.toggleMenu(); }
        // TODO: replace this mechanism with another type of info box view/tab.
        document.querySelector('.arvometsa-output').scrollIntoView({block: 'center'});
    });
}


const arvometsaGraphs = {};

const arvometsaInit = (e: Event) => {
    const elem = e.target as HTMLInputElement;
    if (!elem.checked) { clearHighlights(); }
}

try {
document.querySelector('input#arvometsa').addEventListener('change', arvometsaInit);

document.querySelector('.arvometsa-projections').addEventListener('change', () => updateGraphs());
document.getElementById('arvometsa-per-hectare').addEventListener('change', () => updateGraphs());
document.getElementById('arvometsa-cumulative').addEventListener('change', () => updateGraphs());
document.getElementById('arvometsa-carbon-balance-difference').addEventListener('change', () => updateGraphs());

document.getElementById('arvometsa-goto-location').addEventListener('click', () => {
    const bbox = selectedFeatureBounds;
    if (bbox) { fitBounds(bbox, 0.4, 0.15); }
});
} catch (error) {
    // TODO later
}