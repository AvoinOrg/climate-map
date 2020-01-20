import { assert, execWithMapLoaded, originalLayerDefs } from './utils';
import { 
    toggleBaseMapSymbols, setLayoutProperty, moveLayer
 } from './map';


const backgroundLayerGroups = { 'terramonitor': true }
interface ILayerGroupState { [s: string]: boolean; }
export const layerGroupState: ILayerGroupState = {
    terramonitor: true,
    ete: false,
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
        'valio-fields-country-boundary',
        'valio-fields-country-fill',
        'valio-fields-country-highlighted',
        'valio-fields-regional-state-boundary',
        'valio-fields-regional-state-fill',
        'valio-fields-regional-state-highlighted',
        'valio-fields-region-boundary',
        'valio-fields-region-fill',
        'valio-fields-region-highlighted',
        'valio-fields-municipality-boundary',
        'valio-fields-municipality-fill',
        'valio-fields-municipality-highlighted',
        // 'valio-fields-highlighted',
        'valio-fields-boundary',
        'valio-fields-fill',
        'valio-fields-co2',
        'mavi-plohko-removed-fill',
        'mavi-plohko-removed-outline',
        'mavi-plohko-removed-co2',
    ],
    'forest-grid': ['metsaan-hila-c', 'metsaan-hila-sym', 'metsaan-hila-outline'],
    'forests': [
        () => hideAllLayersMatchingFilter(x => /mature-forests/.test(x)),

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
    'fi-buildings': [
        'fi-buildings-fill', 'fi-buildings-outline',
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
            assert(layer in originalLayerDefs, `Layer does not exist: ${JSON.stringify(layer)}`);
            const { BEFORE } = originalLayerDefs[layer];
            assert(BEFORE, `Layer ${layer} does not contain a BEFORE declaration: JSON.stringify(originalLayerDefs[layer])`);

            execWithMapLoaded(() => {
                moveLayer(layer, BEFORE); // Make this the topmost layer.
                setLayoutProperty(layer, 'visibility', newState ? 'visible' : 'none');
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



export const layerComponentList = []

interface IAddLayerComponentOptions {
    category: string;
    id: string;
    name: string;
    layers: string[];
    component: any;
}

export const addLayerComponent = (props: IAddLayerComponentOptions) => {
    layerComponentList.push(props)
}
