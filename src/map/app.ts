import { invertLayerTextHalo } from './utils';
import { layerGroups, layerGroupState, toggleGroup } from './layer_groups';
import { setLayoutProperty, getMapLayers, moveLayer, zoomTo, mapInit, panTo, onMapLoad } from "./map";


// Set up event handlers for layer toggles, etc.
window.addEventListener('load', () => {
    const layerToggles = document.querySelectorAll('.layer-card input[name="onoffswitch"]');
    for (const el of Array.from(layerToggles) as HTMLInputElement[]) {
        if (el.disabled) continue;
        if (el.hasAttribute("data-special")) continue; // disable automatic handling

        el.addEventListener('change', () => { toggleGroup(el.id); });

        // Populate layer state from DOM.
        layerGroupState[el.id] = el.checked;
        const known = el.id in layerGroups;
        if (!known) {
            console.log('ERROR: Unknown layer in menu .layer-cards:', el.id, el);
        }
    }

    const layerGroupElems = document.querySelectorAll('.layer-group > label > input');
    for (const el of Array.from(layerGroupElems)) {
        el.addEventListener('change', () => {
            el.parentElement!.parentElement!.classList.toggle('active');
        });
    }
})

// @ts-ignore
window.toggleSatellite = function() {
    toggleGroup('terramonitor');
    Array.from(document.querySelectorAll('.satellite-button-container img'))
    .forEach(x => x.toggleAttribute('hidden'));
}
// @ts-ignore
window.toggleMenu = function() {
    Array.from(document.querySelectorAll('.menu-toggle'))
    .forEach(x => x.toggleAttribute('hidden'))
}

const enableDefaultLayers = () => {
    const enabledGroups = Object.keys(layerGroupState).filter(g => layerGroupState[g])
    for (const group of enabledGroups) {
        const normalLayers = layerGroups[group]
        .filter((l: any) => typeof l === 'string') as string[]
        for (const layer of normalLayers) {
            setLayoutProperty(layer, 'visibility', 'visible');
        }
    }
}

onMapLoad(() => {
    enableDefaultLayers();

    // Ensure all symbol layers appear on top of satellite imagery.
    getMapLayers()
    .filter(x => x.type === 'symbol')
    .forEach(layer => {
        // Rework Stadia default style to look nicer on top of satellite imagery
        invertLayerTextHalo(layer)
        layer.BEFORE = layer.BEFORE || 'BG_LABEL';
        moveLayer(layer.id, layer.BEFORE)
    });


    // A simple way to open the map in a certain location with certain layers enabled.

    interface IHashParams {
        lat: string
        lon: string
        zoom: string
        layers: string
    }
    // @ts-ignore TODO
    const hashParams: IHashParams = window.location.hash.replace(/^[#?]*/, '').split('&').reduce((prev, item) => (
        Object.assign({ [item.split('=')[0]]: item.split('=')[1] }, prev)
    ), {});

    // TODO: fix command race condition here when using mapbox-gl
    try {
        const lat = Number.parseFloat(hashParams.lat);
        const lon = Number.parseFloat(hashParams.lon);
        panTo(lon, lat);
    } catch (e) {}

    try {
        const zoom = Number.parseFloat(hashParams.zoom);
        if (zoom >= 0 && zoom < 25 && !Number.isNaN(zoom)) { zoomTo(zoom); }
    } catch(e) {}

    try {
        const layers = hashParams.layers.split(',')
        for (const layer of layers) { toggleGroup(layer, true); }
    } catch (e) {}

}); // /map onload

mapInit();
