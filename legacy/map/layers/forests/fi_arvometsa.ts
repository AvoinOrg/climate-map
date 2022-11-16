import { Expression } from 'mapbox-gl';
import { roundToSignificantDigits, fillOpacity } from '../../utils';
import { addLayer, addSource } from '../../map';
import { registerGroup } from 'src/map/layer_groups';


export const PROPERTY_MINZOOM = 12
export const PROPERTY_MAXZOOM = 14

interface ILayerOption { minzoom: number, maxzoom?: number, id: string }
interface ILayerOptions { [s: string]: ILayerOption }
export const layerOptions: ILayerOptions = {
  'arvometsa': { minzoom: PROPERTY_MAXZOOM, id: 'standid' },
  'arvometsa-property': { minzoom: PROPERTY_MINZOOM, maxzoom: PROPERTY_MAXZOOM, id: 'localid' },
  'arvometsa-municipality': { minzoom: 7.5, maxzoom: PROPERTY_MINZOOM, id: 'localid' },
  'arvometsa-region': { minzoom: 5.5, maxzoom: 7.5, id: 'localid' },
  'arvometsa-regional-state': { minzoom: 4, maxzoom: 5.5, id: 'localid' },
  'arvometsa-country': { minzoom: 0, maxzoom: 4, id: 'localid' },
}

// In theory, we could display just the properties as MVT,
// but Mapbox-GL is too buggy so it's more reliable to also have munis as MVT.
// const mvtLayers = ['arvometsa', 'arvometsa-property', 'arvometsa-municipality'];

// geojson fetch not yet implemented:
const mvtLayers = Object.keys(layerOptions);

// Hue 54..159, saturation 57..4
const colorboxStepsNeg = [
  '#FFEC42',
  '#FDF259',
  '#FCF670',
  '#F0F596',
]

const stepsToLinear = (min, max, steps) => {
  const step = (max - min) / (steps.length - 1);
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
export const arvometsaAreaCO2eFillColor: (expr: Expression) => Expression = expr => [
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
  "tiles": [`https://server.avoin.org/data/map/arvometsa/{z}/{x}/{y}.pbf.gz?v=0`],
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

for (const [source, path] of Object.entries(sources)) {
  const sourceName = `arvometsa-${source}`
  const opts = layerOptions[sourceName];
  const sourceOpts = mvtLayers.indexOf(sourceName) !== -1
    ? {
      "type": "vector",
      "tiles": [`https://server.avoin.org/data/map/arvometsa/${path}/tiles/{z}/{x}/{y}.pbf.gz?v=2`],
      minzoom: 0, // Math.floor(opts.minzoom), // minzoom 0 for all is useful for highlights!
      maxzoom: Math.ceil(opts.maxzoom!),
      bounds: [19, 59, 32, 71], // Finland
    } : {
      "type": "geojson",
      "data": `https://server.avoin.org/data/map/arvometsa/${path}.geojson.gz?v=0`,
    };
  addSource(sourceName, {
    attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
    ...sourceOpts,
  } as any);
}



export const arvometsaTextfieldExpression: (co2eValueExpr: Expression) => Expression = (co2eValueExpr) => [
  "case", ["has", 'm0_cbt1'], [
    "concat",
    roundToSignificantDigits(3, ['get', 'area']) as Expression,
    " ha\n",
    roundToSignificantDigits(2, co2eValueExpr) as Expression,
    " t CO2e/y/ha",
  ], "",
];


export const arvometsaSumMethodAttrs: (method: number | Expression, attrPrefix: string) => Expression
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

export const arvometsaBestMethodCumulativeSumCbt = arvometsaSumMethodAttrs(['get', 'best_method'], 'cbt');

export const arvometsaCumulativeCO2eValueExpr = arvometsaBestMethodCumulativeSumCbt;

for (const [type, opts] of Object.entries(layerOptions)) {
  const extraOpts = mvtLayers.indexOf(type) === -1 ? {} : { "source-layer": "default" };
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
    minzoom: opts.minzoom,
    maxzoom: opts.maxzoom || 24,
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

registerGroup('arvometsa', [
  'arvometsa-country-fill',
  'arvometsa-country-boundary',
  'arvometsa-country-highlighted',
  'arvometsa-regional-state-fill',
  'arvometsa-regional-state-boundary',
  'arvometsa-regional-state-highlighted',
  'arvometsa-region-fill',
  'arvometsa-region-boundary',
  'arvometsa-region-highlighted',
  'arvometsa-municipality-fill',
  'arvometsa-municipality-boundary',
  'arvometsa-municipality-highlighted',
  'arvometsa-property-fill',
  'arvometsa-property-boundary',
  'arvometsa-property-highlighted',
  'arvometsa-fill',
  'arvometsa-boundary',
  'arvometsa-highlighted',
  'arvometsa-sym',
])
