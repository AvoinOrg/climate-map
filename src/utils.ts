import { sanitize } from 'dompurify';
import { Layer, MapLayerMouseEvent, PopupOptions, Popup, Expression } from 'mapbox-gl';
import { linear_kryw_0_100_c71, linear_bgyw_20_98_c66 } from './colormap';
import { map } from './map';

// @ts-ignore
const mapboxgl0 = mapboxgl;

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

export const genericPopupHandler: (layer: string | string[], fn: (e: MapLayerMouseEvent) => void) => void
= (layer, fn) => {
    if (Array.isArray(layer)) {
        return layer.forEach(l => genericPopupHandler(l, fn));
    }
    map.on('click', layer, fn);
    map.on('mouseenter', layer, function() {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', layer, function() {
        map.getCanvas().style.cursor = '';
    });
}

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
            // @ts-ignore
            map.setPaintProperty(layer.id, k, v, { validate: false });
        }
    }
}

export const replaceLayer = (layer: Layer) => {
    // assert('BEFORE' in layer, `Layer ${layer.id} is missing a BEFORE declaration`);
    if (map.getLayer(layer.id)) map.removeLayer(layer.id);
    map.addLayer(layer, layer.BEFORE);
}

export const createPopup = (ev: MapLayerMouseEvent, html: string, options?: PopupOptions) => 
    new Popup()
        .setLngLat(ev.lngLat)
        .setHTML( sanitize(html) )
        .addTo(map);
