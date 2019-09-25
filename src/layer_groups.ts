import { map } from './map';
import { assert, invertLayerTextHalo } from './utils';
import { Layer } from 'mapbox-gl';

declare module "mapbox-gl" {
    export interface Layer {
        BEFORE?: string
    }
}

const backgroundLayerGroups = { 'terramonitor': true }
interface ILayerGroupState { [s: string]: boolean; }
export const layerGroupState: ILayerGroupState = {
    terramonitor: true,
    ete: false,
}

// delayedMapOperations are executed as soon as the map is loaded.
const delayedMapOperations: (() => void)[] = [];
export const executeDelayedMapOperations = () => {
    for (const op of delayedMapOperations) { op(); }
    delayedMapOperations.length = 0; // Free memory
}

const execWithMapLoaded = (fn: () => void) => {
    if (window.initialMapLoaded) { fn(); }
    else { delayedMapOperations.push(fn); }
}

const toggleBaseMapSymbols = () => {
    execWithMapLoaded(() =>
        (map.getStyle().layers || [])
        .filter(x => x.type === 'symbol')
        .forEach(invertLayerTextHalo)
    )
}

export const hideAllLayersMatchingFilter: (filterFn: (group: string) => boolean) => void
= (filterFn) => {
    for (const group of Object.keys(layerGroupState)) {
        if (group in backgroundLayerGroups) return;
        if (filterFn && !filterFn(group)) return;
        toggleGroup(group, false);
    }
}

// TODO: move elsewhere?
export const natura2000_mappings = {
    "natura2000-sac": { layer: "NaturaSAC_alueet", color: 'cyan' },
    "natura2000-sac-lines": { layer: "NaturaSAC_viivat", color: 'gray' },
    "natura2000-sci": { layer: "NaturaSCI_alueet", color: 'purple' },
    "natura2000-spa": { layer: "NaturaSPA_alueet", color: 'magenta' },
    "natura2000-impl-ma": { layer: "NaturaTotTapa_ma", color: '#ca9f74' },
    "natura2000-impl-r": { layer: "NaturaTotTapa_r", color: 'brown' },
}

interface ILayerGroups { [s: string]: (string | (() => void))[] }
export const layerGroups: ILayerGroups = {
    'valio': [
        () => hideAllLayersMatchingFilter(x => !/valio/.test(x)),
        'valio-fields-boundary', 'valio-fields-fill', 'valio-plohko-co2',
        'mavi-plohko-removed-fill',
        'mavi-plohko-removed-outline',
        'mavi-plohko-removed-co2',
    ],
    'forest-grid': ['metsaan-hila-c', 'metsaan-hila-sym', 'metsaan-hila-outline'],
    'forests': [
        () => hideAllLayersMatchingFilter(x => /mature-forests/.test(x)),

        'arvometsa-actionable-relative-raster',
        'arvometsa-actionable-relative-fill',
        'arvometsa-boundary',
        'arvometsa-actionable-relative-sym',
        // 'metsaan-stand-raster', 'metsaan-stand-fill', 'metsaan-stand-co2', 'metsaan-stand-outline',

        // Norway
        'nibio-ar50-forests-fill', 'nibio-ar50-forests-outline', 'nibio-ar50-forests-sym',
    ],
    'ethiopia-forests': [
        'ethiopia_forest_change_2003_2013-raster',
    ],
    'madagascar-land-cover': [
        'madagascar-2017-mosaic-raster',
    ],
    'arvometsa': [
        'arvometsa-fill',
        'arvometsa-boundary',
        'arvometsa-sym',
        'arvometsa-highlighted',
    ],
    'mature-forests': [
        () => hideAllLayersMatchingFilter(x => /^forests$/.test(x)),
        'metsaan-stand-mature-fill', 'metsaan-stand-outline', 'metsaan-stand-mature-sym', 'metsaan-stand-mature-raster',
    ],
    'zonation6': ['zonation-v6-raster'],
    'ete': ['metsaan-ete-all-c', 'metsaan-ete-all-outline', 'metsaan-ete-all-sym'],
    // @ts-ignore
    'ete-all-labels': [() => window.toggleEteCodes()],
    'terramonitor': ['terramonitor', () => toggleBaseMapSymbols()],
    // @ts-ignore
    'no2-raster': ['no2-raster', () => window.setNO2()],
    'mangrove-forests': ['mangrove-wms'],
    'natura2000': [
        ...Object.keys(natura2000_mappings).map(x => x),
        ...Object.keys(natura2000_mappings).map(x => `${x}-sym`),
    ],
    'fields': [
        'mavi-plohko-removed-fill', 'mavi-plohko-removed-outline',
        'nibio-soils-fill', 'nibio-soils-outline', 'nibio-soils-sym',
    ],
    'fields-peatland': [
        'mavi-plohko-peatland-fill',
        'mavi-plohko-peatland-outline',
        'mavi-plohko-peatland-co2',
    ],
    'fields-mineral': [
        'mavi-plohko-mineral-fill',
        'mavi-plohko-mineral-outline',
        'mavi-plohko-mineral-co2',
    ],
    'helsinki-buildings': [
        'helsinki-buildings-fill', 'helsinki-buildings-outline', 'helsinki-buildings-co2',
        'helsinki-puretut-fill', 'helsinki-puretut-outline', 'helsinki-puretut-sym',
    ],
    'building-energy-certificates': ['hel-energiatodistukset-fill', 'hel-energiatodistukset-outline', 'hel-energiatodistukset-sym'],
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

    'bogs': ['gtk-turvevarat-suot-fill', 'fi-mml-suot-fill'],

    'culverts': ['fi-vayla-tierummut-circle', 'fi-vayla-ratarummut-circle'],

    'hedge-pilot-area': ['hedge-pilot-area-raster'],
};

interface ISourceDefs { [s: string]: mapboxgl.AnySourceData }
export const originalSourceDefs: ISourceDefs = {}
export const addSource = (name: string, source: mapboxgl.AnySourceData) => {
    originalSourceDefs[name] = source;
    execWithMapLoaded(() => map.addSource(name, source));
}

function getFirstAncestorMatching(el: (Element | null), filter: (el: Element) => boolean) {
    while (el !== null) {
        el = el.parentElement;
        if (el !== null && filter(el)) return el;
    }
    return null;
}

export const toggleGroup = (group: string, forcedState?: boolean) => {
    const oldState = layerGroupState[group];
    const newState = forcedState === undefined ? !oldState : forcedState;
    if (oldState === newState) return;

    const el = document.querySelector(`.layer-card input#${group}`) as HTMLInputElement
    if (el) el.checked = newState

    for (const layer of layerGroups[group]) {
        if (typeof layer === 'function') {
            execWithMapLoaded(layer);
        } else {
            assert(layer in originalLayerDefs, JSON.stringify(layer));
            const { BEFORE } = originalLayerDefs[layer];
            assert(BEFORE, JSON.stringify(originalLayerDefs[layer]));

            execWithMapLoaded(() => {
                map.moveLayer(layer, BEFORE); // Make this the topmost layer.
                map.setLayoutProperty(layer, 'visibility', newState ? 'visible' : 'none');
            })
        }
    }
    layerGroupState[group] = newState;

    if (group in backgroundLayerGroups) return;

    const layerCard = getFirstAncestorMatching(el, e => e.classList.contains('layer-card'));
    if (!layerCard) {
        console.error('Could not find a .layer-card for layer:', group, el);
    }
    if (layerCard && layerCard.classList.contains('layer-active') !== newState) {
        layerCard.classList.toggle('layer-active');
    }
}

interface ILayerDefs { [s: string]: Layer}
export const originalLayerDefs: ILayerDefs = {};
export const addLayer = (layer: mapboxgl.Layer, visibility = 'none') => {
    assert('BEFORE' in layer, `Layer ${layer.id} is missing a BEFORE declaration`);
    assert(!window.initialMapLoaded || map.getLayer(layer.BEFORE!), `getLayer(${layer.BEFORE}) failed`);

    const layout = layer.layout || {}
    // @ts-ignore TODO
    layout.visibility = visibility

    layer.paint = layer.paint || {};
    if (layer.type === 'raster') {
        // @ts-ignore TODO
        layer.paint['raster-resampling'] = layer.paint['raster-resampling'] || 'nearest';
    }
    originalLayerDefs[layer.id] = layer;
    execWithMapLoaded(() => map.addLayer({ layout, ...layer }, layer.BEFORE));
}
