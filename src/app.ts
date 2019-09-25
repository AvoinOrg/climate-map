import { GeoJSONSourceRaw } from "mapbox-gl";
import { invertLayerTextHalo } from './utils';
import { layerGroups, layerGroupState, toggleGroup, executeDelayedMapOperations } from './layer_groups';
import { map } from './map';
import { kiinteistorekisteriTunnusGeocoder, enableMMLPalstatLayer } from './layers/fi_property_id';

declare global {
    interface Window { initialMapLoaded: boolean; }
}

// External dependencies:
// @ts-ignore
const mapboxgl0 = mapboxgl;
// @ts-ignore
const MapboxGeocoder0 = MapboxGeocoder

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
            map.setLayoutProperty(layer, 'visibility', 'visible');
        }
    }
}

window.initialMapLoaded = false;
map.on('load', () => {
    window.initialMapLoaded = true;

    const emptyGeoJson: GeoJSONSourceRaw = { type: 'geojson', data: { type: "FeatureCollection", features: [], } };

    // Add empty pseudo-layers to make Z-ordering much easier:
    map.addLayer({ id: 'BACKGROUND', type: 'fill', source: emptyGeoJson });
    map.addLayer({ id: 'FILL', type: 'fill', source: emptyGeoJson, BEFORE: 'BACKGROUND' });
    map.addLayer({ id: 'OUTLINE', type: 'fill', source: emptyGeoJson, BEFORE: 'FILL' }); // Outlines go on top of fills, etc. But below labels
    map.addLayer({ id: 'BG_LABEL', type: 'fill', source: emptyGeoJson, BEFORE: 'OUTLINE' }); // Background map labels are less important than custom labels
    map.addLayer({ id: 'LABEL', type: 'fill', source: emptyGeoJson, BEFORE: 'BG_LABEL' }); // Labels go on top of almost everything
    map.addLayer({ id: 'TOP', type: 'fill', source: emptyGeoJson, BEFORE: 'LABEL' }); // TOP goes on top of labels too

    executeDelayedMapOperations();
    enableDefaultLayers();

    // Ensure all symbol layers appear on top of satellite imagery.
    (map.getStyle().layers || [])
    .filter(x => x.type === 'symbol')
    .forEach(layer => {
        // Rework Stadia default style to look nicer on top of satellite imagery
        invertLayerTextHalo(layer)
        layer.BEFORE = layer.BEFORE || 'BG_LABEL';
        map.moveLayer(layer.id, layer.BEFORE)
    });

});  // /map onload

// Only add the geocoding widget if it's been loaded.
// @ts-ignore
if (MapboxGeocoder0 !== undefined) {
    const geocoder = new MapboxGeocoder0({
        accessToken: process.env.GEOCODING_ACCESS_TOKEN,
        countries: 'fi',
        localGeocoder: kiinteistorekisteriTunnusGeocoder,
        mapboxgl: mapboxgl0,
    })
    map.addControl(geocoder);

    // Monkey-patch the geocoder to deal with async local queries:
    const geocoderOrigGeocode = geocoder._geocode;
    const geocoderOrigZoom = geocoder.options.zoom;
    geocoder._geocode = async (searchInput: string) => {
        let localResults: Object[] = [];
        try {
            localResults = await kiinteistorekisteriTunnusGeocoder(searchInput);
            if (localResults.length > 0) {
                enableMMLPalstatLayer();
                // Don't invoke the external API here. It would have no useful results anyway.
                geocoder.options.localGeocoderOnly = true;
                geocoder.options.zoom = 14;
            }
        } catch (e) {
            console.error(e);
        }
        // A reasonable limit for Property Registry queries
        geocoder.options.localGeocoder = (_dummyQuery: any) => localResults;
        geocoderOrigGeocode.call(geocoder, searchInput);

        geocoder.options.localGeocoderOnly = false;
        geocoder.options.zoom = geocoderOrigZoom;
    }
}

map.addControl(new mapboxgl0.NavigationControl());

map.addControl(new mapboxgl0.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: true,
    },
    trackUserLocation: true,
}));

map.addControl(new mapboxgl0.ScaleControl(), 'bottom-right');
