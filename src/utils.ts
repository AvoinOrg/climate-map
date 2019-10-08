import { Layer, Expression } from 'mapbox-gl';
import { linear_kryw_0_100_c71, linear_bgyw_20_98_c66 } from './colormap';
import { setPaintProperty, getLayer, removeLayer, directAddLayer, isMapLoaded } from './map';


const colormapToStepExpr = (colormap: number[][], minValue: number, maxValue: number, expr: Expression) => {
    // @ts-ignore TODO
    const cmapToRGBA = ([r, g, b]) => `rgb(${(r)},${g},${b})`;
    const cmap = colormap
        .map(x => x.map(c => Math.round(255 * c)))
        .map(cmapToRGBA);

    const delta = (maxValue - minValue) / (cmap.length - 1);
    const ret: Expression = ['step', expr];
    ret.push(cmap[0]);
    let value = minValue;
    for (const color of cmap.slice(1)) {
        ret.push(value);
        ret.push(color);
        value += delta;
    }
    return ret;
}

// 'Fire' aka linear_kryw_0_100_c71 is a perceptually uniform color map.
const fireColorMapStepExpr = colormapToStepExpr.bind(
    null,
    // The first few values are too white for my taste, hence the slice().
    linear_kryw_0_100_c71.reverse().slice(5)
);

const cetL9ColorMapStepExpr = colormapToStepExpr.bind(null, linear_bgyw_20_98_c66.reverse());

export const fillOpacity = 0.65;


// NB: By using the '/' operator instead of '*', we get rid of float bugs like 1.2000000000004.
export const roundToSignificantDigitsPos = (n: number, expr: Expression) => [
    // Multiply back by true scale
    '/',
    // Round to two significant digits:
    [
        'round', [
            '/',
            expr,
            ['^', 10, ['+', -n + 1, ['floor', ['log10', expr]]]],
        ],
    ],
    ['^', 10, ['-', n - 1, ['floor', ['log10', expr]]]],
]
export const roundToSignificantDigits = (n: number, expr: Expression) => [
    'case',
    ['==', 0, expr], 0,
    ['>', 0, expr], ['*', -1, roundToSignificantDigitsPos(n, ['*', -1, expr])],
    roundToSignificantDigitsPos(n, expr),
]

// Pretty print to precision:
export const pp = (x: number, precision = 2) => (+x.toPrecision(precision)).toLocaleString();

export const assert = (expr: any, message: any) => {
    if (!expr) throw new Error(`Assertion error: ${message}`);
}

export const invertLayerTextHalo = (layer: Layer) => {
    layer.paint = { ...layer.paint }
    // @ts-ignore TODO
    if (layer.paint && layer.paint["text-halo-width"]) {
        // Original style is something like:
        // text-color: "#999"
        // text-halo-blur: 1
        // text-halo-color: "rgb(242,243,240)"
        // text-halo-width: 2
        const props = {
            'text-halo-blur': 1,
            'text-halo-width': 2.5,
            'text-color': '#fff',
            'text-halo-color': '#000',
        }

        for (const [k, v] of Object.entries(props)) {
            setPaintProperty(layer.id, k, v); //, { validate: false });
        }
    }
}

export const replaceLayer = (layer: Layer) => {
    // assert('BEFORE' in layer, `Layer ${layer.id} is missing a BEFORE declaration`);
    if (getLayer(layer.id)) { removeLayer(layer.id); }
    directAddLayer(layer, layer.BEFORE);
}

export function getGeoJsonGeometryBounds(coordinates: any) {
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


// delayedMapOperations are executed as soon as the map is loaded.
const delayedMapOperations: (() => void)[] = [];
export const executeDelayedMapOperations = () => {
    for (const op of delayedMapOperations) { op(); }
    delayedMapOperations.length = 0; // Free memory
}
export const execWithMapLoaded = (fn: () => void) => {
    if (isMapLoaded()) { fn(); }
    else { delayedMapOperations.push(fn); }
}


interface ISourceDefs { [s: string]: mapboxgl.AnySourceData }
export const originalSourceDefs: ISourceDefs = {}
interface ILayerDefs { [s: string]: Layer}
export const originalLayerDefs: ILayerDefs = {};
