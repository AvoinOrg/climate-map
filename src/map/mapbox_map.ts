import mapboxgl from "mapbox-gl"
import { Layer, MapLayerMouseEvent, PopupOptions, GeoJSONSourceRaw } from "mapbox-gl";
import { execWithMapLoaded, assert, invertLayerTextHalo, originalSourceDefs, originalLayerDefs, executeDelayedMapOperations } from "./utils";
import { sanitize } from "dompurify";
import { kiinteistorekisteriTunnusGeocoder, enableMMLPalstatLayer } from './layers/fi_property_id';

// @ts-ignore
// eslint-disable-next-line import/no-webpack-loader-syntax
mapboxgl.workerClass = require('worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker').default;

declare module "mapbox-gl" {
    export interface Layer {
        BEFORE?: string
    }
}

// External dependencies:
const mapboxgl0 = mapboxgl;
// @ts-ignore imported externally from index.html
const MapboxGeocoder0 = window.MapboxGeocoder

// This must be set, but the value is not needed here.
mapboxgl0.accessToken = 'not-needed';
mapboxgl0.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN

// emptyStyle is useful for debugging some problems.
// For instance, it turns out that stadiamaps greatly interferes with other MVT tile layers!
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const emptyStyle: mapboxgl.Style = {
    "version": 8,
    "name": "Empty",
    "metadata": {
        "mapbox:autocomposite": true,
        "mapbox:type": "template"
    },
    "glyphs": "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
    "sources": {},
    "layers": [
        {
            "id": "background",
            "type": "background",
            "paint": {
                "background-color": "rgba(0,0,0,0)"
            }
        }
    ]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mapboxBaseStyle = 'mapbox://styles/mapbox/streets-v11'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const stadiaMapsBaseStyle = 'https://tiles.stadiamaps.com/styles/alidade_smooth.json'

const style = mapboxBaseStyle

export const map = new mapboxgl0.Map({
    container: 'map', // container id
    style,
    center: [28, 65], // starting position [lng, lat]
    zoom: 5, // starting zoom
    attributionControl: false,
}).addControl(new mapboxgl.AttributionControl({
    compact: false,
    customAttribution: '<a href="https://netlify.com">Powered by Netlify</a>'
}));

// Suppress uninformative console error spam:
map.on('error', (e) => {
    if (e.error.message === '') { return; }
    console.error(e.error.message, e.error.stack, e.target);
})


export const addSource = (name: string, source: mapboxgl.AnySourceData) => {
    originalSourceDefs[name] = source;
    directAddSource(name, source);
}

export const addImage = (name: string, image: HTMLImageElement) => {
    execWithMapLoaded(() => map.addImage(name, image));
}

export const directAddSource = (name: string, source: mapboxgl.AnySourceData) => {
    execWithMapLoaded(() => map.addSource(name, source));
}
export const directAddLayer = (layer: mapboxgl.AnyLayer, before?: string) => {
    execWithMapLoaded(() => map.addLayer(layer, before));
}
export const getLayer = (layer: string) => map.getLayer(layer);
export const removeLayer = (layer: string) => map.removeLayer(layer);
export const moveLayer = (layer: string, before?: string) => map.moveLayer(layer, before);


export const addLayer = (layer: Layer, visibility: mapboxgl.Visibility = 'none') => {
    assert('BEFORE' in layer, `Layer ${layer.id} is missing a BEFORE declaration`);
    assert(!initialMapLoaded || getLayer(layer.BEFORE!), `getLayer(${layer.BEFORE}) failed`);

    const layout = layer.layout || {}
    layout.visibility = visibility

    layer.paint = layer.paint || {};
    if (layer.type === 'raster') {
        layer.paint['raster-resampling'] = layer.paint['raster-resampling'] || 'nearest';
    }
    originalLayerDefs[layer.id] = layer;
    // @ts-ignore
    directAddLayer({ layout, ...layer }, layer.BEFORE);
}

export const toggleBaseMapSymbols = () => {
    execWithMapLoaded(() =>
        getMapLayers()
            .filter(x => x.type === 'symbol')
            .forEach(invertLayerTextHalo)
    )
}


export const genericPopupHandler: (layer: string | string[], fn: (e: MapLayerMouseEvent) => void) => void
    = (layer, fn) => {
        if (Array.isArray(layer)) {
            return layer.forEach(l => genericPopupHandler(l, fn));
        }
        map.on('click', layer, fn);
        map.on('mouseenter', layer, function () {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layer, function () {
            map.getCanvas().style.cursor = '';
        });
    }

export const createPopup = (ev: MapLayerMouseEvent, html: string, options?: PopupOptions) =>
    new mapboxgl0.Popup(options)
        .setLngLat(ev.lngLat)
        .setHTML(sanitize(html))
        .addTo(map);


// NB: mapbox-gl will break without the indirection here.
export const setLayoutProperty = (layer: string, name: string, value: any) =>
    map.setLayoutProperty(layer, name, value);
export const setPaintProperty = (layer: string, name: string, value: any) =>
    map.setPaintProperty(layer, name, value);
export const setFilter = (layer: string, filter: any[]) =>
    map.setFilter(layer, filter);

export const fitBounds = (bbox: number[], lonExtra: number, latExtra: number) => {
    const flyOptions = {};
    const [lonMin, latMin, lonMax, latMax] = bbox;
    const lonDiff = lonMax - lonMin;
    const latDiff = latMax - latMin;
    return map.fitBounds([
        [lonMin - lonExtra * lonDiff, latMin - latExtra * latDiff],
        [lonMax + lonExtra * lonDiff, latMax + latExtra * latDiff]
    ], flyOptions);
}
export const zoomTo = (zoom: number) => map.zoomTo(zoom);
export const panTo = (lon: number, lat: number) => map.panTo(new mapboxgl0.LngLat(lon, lat))
export const flyTo = (lon: number, lat: number, zoom: number) => map.flyTo({ center: [lon, lat], zoom })

export const querySourceFeatures = (source: string, sourceLayer: string) => map.querySourceFeatures(source, { sourceLayer });
export const getSource = (id: string) => map.getSource(id);
export const removeSource = (id: string) => map.removeSource(id);
export const getBounds: () => mapboxgl.LngLatBounds = () => map.getBounds()

export const getMapLayers: () => Layer[] = () => map.getStyle().layers || [];

export const addMapEventHandler = (type: string, listener: (ev: any) => void) => {
    map.on(type, listener)
}

export const removeMapEventHandler = (type: string, listener: (ev: any) => void) => {
    map.off(type, listener)
}

export const isSourceReady = (sourceLayer: string) => {
  try {
    if (map.getSource(sourceLayer) && map.isSourceLoaded(sourceLayer)) {
      return true
    }
  } catch (error) {
    return false
  }
  return false
}

let geocoder
export const getGeocoder = () => geocoder

export const mapInit = () => {
    // Only add the geocoding widget if it's been loaded.
    if (MapboxGeocoder0 !== undefined) {
        geocoder = new MapboxGeocoder0({
            accessToken: process.env.REACT_APP_MAPBOX_ACCESS_TOKEN,
            countries: 'fi',
            localGeocoder: kiinteistorekisteriTunnusGeocoder,
            mapboxgl: mapboxgl0,
        })

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

    // map.addControl(new mapboxgl0.NavigationControl());

    // map.addControl(new mapboxgl0.GeolocateControl({
    //     positionOptions: {
    //         enableHighAccuracy: true,
    //     },
    //     trackUserLocation: true,
    // }));

    map.addControl(new mapboxgl0.ScaleControl(), 'bottom-right');
}

let initialMapLoaded = false;

export const onMapLoad = fn => {
    return map.on('load', () => {
        initialMapLoaded = true;

        const emptyGeoJson: GeoJSONSourceRaw = { type: 'geojson', data: { type: "FeatureCollection", features: [], } };

        // Add empty pseudo-layers to make Z-ordering much easier:
        directAddLayer({ id: 'BACKGROUND', type: 'fill', source: emptyGeoJson });
        directAddLayer({ id: 'FILL', type: 'fill', source: emptyGeoJson, BEFORE: 'BACKGROUND' });
        directAddLayer({ id: 'OUTLINE', type: 'fill', source: emptyGeoJson, BEFORE: 'FILL' }); // Outlines go on top of fills, etc. But below labels
        directAddLayer({ id: 'BG_LABEL', type: 'fill', source: emptyGeoJson, BEFORE: 'OUTLINE' }); // Background map labels are less important than custom labels
        directAddLayer({ id: 'LABEL', type: 'fill', source: emptyGeoJson, BEFORE: 'BG_LABEL' }); // Labels go on top of almost everything
        directAddLayer({ id: 'TOP', type: 'fill', source: emptyGeoJson, BEFORE: 'LABEL' }); // TOP goes on top of labels too

        executeDelayedMapOperations();

        return fn();
    });
}

export const isMapLoaded = () => initialMapLoaded;


export const toggleLayer = (layerName) => {
    const val = map.getLayoutProperty(layerName, 'visibility') === 'none' ? 'visible' : 'none'
    map.setLayoutProperty(layerName, 'visibility', val);
}

export const mapToggleTerrain = () => {
    toggleLayer('terramonitor')
}

export const mapResetNorth = () => { map.resetNorth() }
export const mapZoomOut = () => { map.zoomOut() }
export const mapZoomIn = () => { map.zoomIn() }
export const mapRelocate = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(({ coords }) => {
            const radius = coords.accuracy;
            map.flyTo({
                center: [
                    coords.longitude,
                    coords.latitude,
                ],
                zoom: radius
            });
        });

    }
}
