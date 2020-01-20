import { arcgisToGeoJSON } from '@esri/arcgis-to-geojson-utils';
import WMSCapabilities from 'ol/format/WMSCapabilities.js'
import { sanitize } from 'dompurify';
import { addSource, directAddSource, directAddLayer, getLayer, removeLayer, getSource, removeSource, getBounds, addMapEventHandler, setLayoutProperty, genericPopupHandler, createPopup } from '../map'

declare module "mapbox-gl" {
    interface Layer {
        BEFORE?: string
    }
}

const arcgisSources = {};
const arcgisLayers = {};
const arcgisLayerCache = {};

function wmsGetAllLayers(wmsCapabilities) {
    if ('Name' in wmsCapabilities) {
        return [[wmsCapabilities.Name, wmsCapabilities.Style[0].Name]];
    } else if ('Layer' in wmsCapabilities) {
        return wmsGetAllLayers(wmsCapabilities.Layer);
    } else if (wmsCapabilities instanceof Array) {
        // @ts-ignore TODO
        return Array.concat(...wmsCapabilities.map(wmsGetAllLayers));
    } else {
        console.error('Unknown WMS type:', wmsCapabilities);
    }
}

async function genericArcgisWMSServer(serviceRestUrl, bbox, _) {
    console.log('Showing ArcGIS WMS Server:', serviceRestUrl);

    // const serviceRestUrl = 'http://geogis.kiev.ua/arcgis/rest/services/Aukc/Boreholes/MapServer';
    const idx = serviceRestUrl.toLowerCase().indexOf('/rest/');
    const soapUrl = serviceRestUrl.slice(0, idx) + serviceRestUrl.slice(idx + 5) // only remove the first occurrence of '/rest'
    const tileSize = 256;

    // const serviceInfo = await cachedFetchJSON(`${serviceRestUrl}?f=pjson`);
    // format can be one of: PNG, PNG32, PNG8, JPEG, LERC, MIXED, ...
    // const imageFormat = serviceInfo.format === 'JPEG' ? 'image/jpeg' : 'image/png';
    const imageFormat = 'image/png';

    const parser = new WMSCapabilities();
    const capabilitiesUrl = `${soapUrl}/WMSServer?request=GetCapabilities&service=WMS`
    const response = await cachedFetchText(capabilitiesUrl);
    const capabilities = parser.read(response);
    console.log('WMS server capabilities:', capabilities);

    // TODO: this is a bit questionable
    // const layerData = Array.concat(...capabilities.Capability.Layer.Layer.map(x => x.Layer));

    const layersAndStyles = wmsGetAllLayers(capabilities.Capability);
    const layers = layersAndStyles.map(x => x[0]);
    const styles = layersAndStyles.map(x => x[1]);
    // const layers = layerData.map(x => x.Name).join(',');
    // const styles = layerData.map(x => x.Style[0].Name).join(','); // TODO: get legend URLs also?
    const url2 = `${soapUrl}/WMSServer?bbox={bbox-epsg-3857}&format=${imageFormat}&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=${tileSize}&height=${tileSize}&layers=${layers}&styles=${styles}`;

    if (getLayer(serviceRestUrl)) {
        if (getLayer(serviceRestUrl)) { removeLayer(serviceRestUrl); }
        return; // Toggle visibility
    }
    getSource(serviceRestUrl) && removeSource(serviceRestUrl);
    directAddSource(serviceRestUrl, {
        type: 'raster',
        'tiles': [url2],
        tileSize,
        // "maxzoom": 18, // TODO figure out some sensible value here
        bounds: bbox,
    });

    directAddLayer({
        id: serviceRestUrl,
        source: serviceRestUrl,
        'type': 'raster',
        paint: {
            'raster-opacity': 0.7,
        },
        BEFORE: 'FILL',
    }, 'FILL');
    arcgisLayers[serviceRestUrl] = true;

    // Fetch legend last. Any failure here is non-fatal.
    // TODO: show the legend somewhere.
    const legend = await cachedFetchJSON(`${serviceRestUrl}/legend?f=pjson`);
}

function getViewportGeoEnvelope() {
    const bounds = getBounds();
    return {
        xmin: bounds.getWest(),
        xmax: bounds.getEast(),
        ymin: bounds.getSouth(),
        ymax: bounds.getNorth(),
    };
}

const __cachedFetchJSON_cache = {};
async function cachedFetchJSON(url) {
    if (url in __cachedFetchJSON_cache) {
        return __cachedFetchJSON_cache[url];
    }
    const response = await fetch(url);
    __cachedFetchJSON_cache[url] = await response.json();
    return __cachedFetchJSON_cache[url];
}

const __cachedFetchText_cache = {};
async function cachedFetchText(url) {
    if (url in __cachedFetchText_cache) {
        return __cachedFetchText_cache[url];
    }
    const response = await fetch(url);
    __cachedFetchText_cache[url] = await response.text();
    return __cachedFetchText_cache[url];
}

function boundsIntersect(b1, b2) {
    const noIntersection = (
        b1[0] > b2[2] ||
        b2[0] > b1[2] ||
        b1[1] > b2[3] ||
        b2[1] > b1[3]
    );
    return !noIntersection;
}

async function genericArcgisFeatureServer(layerUrl, bbox, x) {
    // const layerUrl = 'https://services5.arcgis.com/QJebCdoMf4PF8fJP/ArcGIS/rest/services/Strava_Commuters/FeatureServer/0';

    // NB: this is tricky. WFS is not supported by mapbox-gl,
    // and we'd have to refresh the features each time we move around in the map
    // (unless there are sufficiently few features in total!)
    // const url2 = `${url}?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=0&styles=default`;

    console.log('Showing ArcGIS Feature Server:', layerUrl);
    const layerInfo = await cachedFetchJSON(`${layerUrl}?f=pjson`);

    // PBF is apparently not MVT :/
    // https://community.esri.com/thread/226299-feature-service-layer-query-pbf-format-mapbox-vt-spec-compliant
    const preferredFormats = ['geoJSON', 'JSON'];
    const supportedQueryFormats = layerInfo.supportedQueryFormats === null ? [] : layerInfo.supportedQueryFormats.split(', ')
    const queryFormat = preferredFormats.filter(z => supportedQueryFormats.indexOf(z) !== -1)[0];

    if (supportedQueryFormats.length && !queryFormat) {
        console.error('Unsupported query format:', layerInfo.supportedQueryFormats);
        return;
    } else if (!queryFormat) {
        console.error('No supportedQueryFormats:', layerInfo);
        // No formats to use whatsoever
        return;
    }

    if (layerInfo.capabilities.indexOf('Query') === -1) {
        console.error('Layer does not support querying!', layerInfo);
        // TODO: do something about this. Display a UI error?
    }

    // returnCountOnly would also work but requires arcgis 10.0 or 10.6+
    if (!(layerUrl in arcgisLayerCache)) {
        const countUrl = `${layerUrl}/query/?where=1=1&f=pjson&returnIdsOnly=true`;
        const response = await fetch(countUrl);
        const { error, objectIds } = await response.json();
        if (error) {
            console.error('Unexpected error while querying data:', error)
            arcgisLayerCache[layerUrl] = { hasMoreData: true }; // TODO
        } else {
            arcgisLayerCache[layerUrl] = { hasMoreData: objectIds.length > layerInfo.maxRecordCount };
        }
    }
    const hasMoreData = arcgisLayerCache[layerUrl].hasMoreData;

    const formatString = queryFormat === 'JSON' ? 'pjson' : queryFormat.toLowerCase();
    const queryUrl = `${layerUrl}/query?where=1=1&f=${formatString}&outSR=4326&outFields=*`;
    let data;
    if (hasMoreData) {
        // TODO: When a FeatureServer like this is in use,
        // display a button for refetching active FeatureServer layers.
        const viewportEnvelope = getViewportGeoEnvelope();
        const v = viewportEnvelope
        const viewportBounds = [v.xmin, v.ymin, v.xmax, v.ymax];
        if (!boundsIntersect(viewportBounds, bbox)) {
            console.log('Layer does not intersect with viewport: Not showing:', layerUrl)
            // TODO: Maybe just skip the request altogether?
            return;
        }

        const queryParams = `
        geometry=${encodeURIComponent(JSON.stringify(viewportEnvelope))}
        &geometryType=esriGeometryEnvelope
        &inSR=4326
        &spatialRel=esriSpatialRelIntersects
        `.trim().replace(/\s+/g, '');

        const response = await fetch(`${queryUrl}&${queryParams}`);
        data = await response.json();
    } else {
        data = await cachedFetchJSON(queryUrl);
    }

    let source;
    if (queryFormat === 'geoJSON') {
        // hasMoreData = data.properties && data.properties.exceededTransferLimit;
        source = {
            type: 'geojson',
            "data": data,
        };
    } else if (queryFormat === 'JSON') {
        // hasMoreData = data.exceededTransferLimit;
        source = {
            type: 'geojson',
            data: arcgisToGeoJSON(data),
        };
    } else {
        console.error('Unknown queryFormat:', queryFormat);
        return;
    }

    const layerTypes = ['point', 'line', 'edge', 'poly'];
    for (const type of layerTypes) {
        const id = `${layerUrl}--${type}`;
        if (getLayer(id)) { removeLayer(id); }
    }
    if (getSource(layerUrl)) {
        getSource(layerUrl) && removeSource(layerUrl);
        return true; // Toggle visibility
    }
    addSource(layerUrl, source);

    // TODO: try to style these like the original style?
    // TODO: refresh these when the viewpoint changes, or manually?
    // TODO follow rendered coloring where possible?
    // TODO auto-color polygons/lines/points by the only numeric non-ID attribute, if there is just one.
    // TODO display organization info, or at least the data owner info
    directAddLayer({
        id: `${layerUrl}--poly`,
        source: layerUrl,
        'type': 'fill',
        paint: {
            'fill-color': 'cyan',
            'fill-opacity': 0.7,
        },
        "filter": ["==", "$type", "Polygon"],
        BEFORE: 'FILL',
    }, 'FILL');
    directAddLayer({
        id: `${layerUrl}--edge`,
        source: layerUrl,
        'type': 'line',
        paint: {
            'line-color': 'black',
            'line-opacity': 0.5,
        },
        "filter": ["==", "$type", "Polygon"],
        BEFORE: 'OUTLINE',
    }, 'OUTLINE');
    directAddLayer({
        id: `${layerUrl}--point`,
        source: layerUrl,
        'type': 'circle',
        paint: {
            'circle-color': 'green',
            'circle-opacity': 0.7,
            'circle-radius': 15,
        },
        "filter": ["==", "$type", "Point"],
        BEFORE: 'FILL',
    }, 'FILL');
    directAddLayer({
        id: `${layerUrl}--line`,
        source: layerUrl,
        'type': 'line',
        paint: {
            'line-width': 8,
            'line-color': 'red',
            'line-opacity': 0.7,
        },
        "filter": ["==", "$type", "LineString"],
        BEFORE: 'OUTLINE',
    }, 'OUTLINE');

    arcgisSources[layerUrl] = true;
    for (const type of layerTypes) {
        arcgisLayers[`${layerUrl}--${type}`] = true;

        if (type === 'edge') continue;
        genericPopupHandler(`${layerUrl}--${type}`, e => {
            const f = e.features[0];

            let layerName;
            if (x.layer && x.layer.name) {
                layerName = x.layer.name;
            } else if (x.service) {
                layerName = x.service.layers[0].name;
            }
            const title = `${x.service && x.service.name || ''} ${layerName || ''}`.trim();
            let html = `
            <strong>${title}</strong>
            <table class="dataset-query-attributes"><thead>
                <tr><th>Attribute</th><th>Value</th></tr>
            </thead><tbody>
            `;
            for (const [k, v] of Object.entries(f.properties)) {
                if (v === null || v === '' || v === 'null') continue;
                if (typeof v === 'string' && v.trim() === '') continue;
                // TODO escape values, except for img tags
                // TODO turn "obvious" URLs into a href tags.
                // TODO maybe have special handling for SHAPE_* attributes
                html += `<tr><td>${k}</td><td>${v}</td></tr>`;
            }
            html += '</tbody></table>'

            createPopup(e, html, { maxWidth: '420px' });
        });
    }
    return true;
}

async function genericArcgisTileServer(serviceRestUrl, bbox, _) {
    console.log('Showing ArcGIS Tile Server:', serviceRestUrl);
    // const serviceRestUrl = 'http://ags.cuzk.cz/arcgis/rest/services/jmena_statu/MapServer';

    const url2 = `${serviceRestUrl}/tile/{z}/{y}/{x}?blankTile=true`; // blankTile=false would cause a lot of 404 warnings in the logs

    const serviceInfo = await cachedFetchJSON(`${serviceRestUrl}?f=pjson`);

    const minzoom = Math.min(...serviceInfo.tileInfo.lods.map(x => x.level));
    const maxzoom = Math.max(...serviceInfo.tileInfo.lods.map(x => x.level));
    const tileSize = serviceInfo.tileInfo.rows

    if (getLayer(serviceRestUrl)) {
        if (getLayer(serviceRestUrl)) { removeLayer(serviceRestUrl); }
        return; // Toggle visibility
    }

    getSource(serviceRestUrl) && removeSource(serviceRestUrl);
    directAddSource(serviceRestUrl, {
        type: 'raster',
        'tiles': [url2],
        tileSize,
        minzoom,
        maxzoom,
        bounds: bbox,
    });

    directAddLayer({
        id: serviceRestUrl,
        source: serviceRestUrl,
        'type': 'raster',
        paint: {
            'raster-opacity': 0.7,
        },
        BEFORE: 'FILL',
    }, 'FILL');
    arcgisLayers[serviceRestUrl] = true;
}

const queryPointsSource = {
    type: 'geojson',
    data: { "type": "FeatureCollection", features: [], },
};

const refreshQueryPointsUI = () => {
    // These must be removed first before removing/replacing the dependent source.
    if (getLayer('query-points-included')) { removeLayer('query-points-included'); }
    if (getLayer('query-points-excluded')) { removeLayer('query-points-excluded'); }

    getSource('query-points') && removeSource('query-points');
    // @ts-ignore TODO
    directAddSource('query-points', queryPointsSource);

    directAddLayer({
        "id": "query-points-included",
        "type": "circle",
        filter: ['==', ['get', 'type'], 'included'],
        "source": "query-points",
        "paint": {
            "circle-radius": 20,
            "circle-color": "green"
        },
        BEFORE: 'TOP',
    }, 'TOP');

    directAddLayer({
        "id": "query-points-excluded",
        "type": "circle",
        filter: ['!=', ['get', 'type'], 'included'],
        "source": "query-points",
        "paint": {
            "circle-radius": 20,
            "circle-color": "red"
        },
        BEFORE: 'TOP',
    }, 'TOP');
}

const clearQueryPoints = event => {
    event.preventDefault();
    queryPointsSource.data.features = [];
    queryResultsElem.setAttribute('hidden', '');
    refreshQueryPointsUI();
    if (getLayer('dataset-query-results-outline')) { removeLayer('dataset-query-results-outline'); }
}

const queryResultsElem = document.querySelector('#dataset-query-results');
const datasetQueryEnabledElem = document.querySelector('#dataset-query') as HTMLInputElement;
document.querySelectorAll('.dataset-query-clear-points').forEach(el => {
    el.addEventListener('click', clearQueryPoints);
});

const addQueryPoint = async function (e) {
    if (!datasetQueryEnabledElem.checked) { return; }
    if (isDatasetQueryViewMode()) { return; } // Disable while viewing datasets.

    const { lat, lng } = e.lngLat;
    const queryPointMode = (document.querySelector('input[name="dataset-query-point-type"]:checked') as HTMLInputElement).value;
    queryPointsSource.data.features.push({
        "type": "Feature",
        "properties": { "type": queryPointMode },
        "geometry": {
            "type": "Point",
            "coordinates": [lng, lat],
        },
    });
    refreshQueryPointsUI();
    await refreshDatasetQuery(1);
}

datasetQueryEnabledElem.addEventListener('change', e => {
    if (!datasetQueryEnabledElem.checked) { clearQueryPoints(e); }
})

const sanitizeInputHTML = html => {
    const elem = document.createElement("div");
    elem.innerHTML = sanitize(html);
    return elem.textContent || elem.innerText || '';
};

const isDatasetQueryViewMode = () => {
    for (const layer in arcgisLayers) {
        if (getLayer(layer)) { return true; }
    }
    return false;
}

interface ILayer {
    name: string;
    description: string;
}
interface IService {
    name: string;
    description: string;
    layers: ILayer[]
}
interface IResultRow {
    layer?: ILayer;
    service_url: string;
    service?: IService;
    orgName: string;
    description: string;
}

const updateDatasetQueryResultsList = (page, results: IResultRow[]) => {
    queryResultsElem.removeAttribute('hidden');
    // @ts-ignore TODO
    window.setDatasetQueryPage = async p => { await refreshDatasetQuery(p); };

    let pagination = '';
    if (page > 2) { pagination += `<a class="pagination" href="#" onclick="setDatasetQueryPage(1);">Page 1</a> … ` }
    if (page > 1) { pagination += `<a class="pagination" href="#" onclick="setDatasetQueryPage(${page - 1});">Page ${page - 1}</a> ` }
    pagination += ` Page ${page} `;
    if (results.length === 100) { pagination += ` <a class="pagination" href="#" onclick="setDatasetQueryPage(${page + 1});">Page ${page + 1}</a>` }

    let html = `${pagination}<hr/>`;
    for (const [idx, x] of Object.entries(results)) {
        const thumbnailUrl = encodeURI(`${x.service_url}/info/thumbnail`).replace('"', '\"');
        const thumbnailImg = x.service_url && `<img class="dataset-query-thumbnail" onerror="this.style.display='none';" src="${thumbnailUrl}" />`

        let layerName: string;
        if (x.layer && x.layer.name) {
            layerName = x.layer.name;
        } else if (x.service) {
            layerName = x.service.layers[0].name;
        }

        html += `
        <p class="dataset-query-result">
        <strong>${x.service && x.service.name || ''} ${layerName || ''}</strong><br/>
        ${x.orgName ? (x.orgName + '<br/>') : ''}
        ${x.service && x.service.description ? (sanitizeInputHTML(x.service.description) + '<br/>') : ''}
        <button class="button" data-idx="${idx}">Show data on map</button>
        ${thumbnailImg}
        </p>
        `;
    }
    html += `<hr/>${pagination}`;

    async function showData(x) {
        const bbox = x.bbox;
        const exts = x.service && x.service.supportedExtensions || '';
        if (exts.indexOf('WMSServer') !== -1) {
            await genericArcgisWMSServer(x.service_url, bbox, x);
        } else if (x.service.tileInfo) {
            await genericArcgisTileServer(x.service_url, bbox, x);
        } else if (exts.indexOf('FeatureServer') !== -1) {
            await genericArcgisFeatureServer(x.url, bbox, x);
        } else if (x.layer && x.layer.type === 'Feature Layer') {
            await genericArcgisFeatureServer(x.url, bbox, x);
        } else {
            console.error('Unsupported type??', exts, x)
        }

        // Hide and show result bounds as necessary:

        const queryPointsVisibility = isDatasetQueryViewMode() ? 'none' : 'visible';
        const queryPointsLayers = ['query-points-included', 'query-points-excluded', 'dataset-query-results-outline'];
        for (const layer of queryPointsLayers) {
            setLayoutProperty(layer, 'visibility', queryPointsVisibility);
        }
    }
    queryResultsElem.innerHTML = sanitize(html);
    queryResultsElem.querySelectorAll('button').forEach(e => {
        e.addEventListener('click', event => {
            const el = event.target as HTMLInputElement;
            const idx = el.getAttribute('data-idx');
            if (showData(results[idx])) {
                el.classList.toggle('active')
                el.innerText = el.classList.contains('active') ? 'Hide data' : 'Show data on map';
            }
        })
    })
};

let datasetQueryNum = 0;
let latestDatasetResultsNum = 0;
const refreshDatasetQuery = async function (pageNum) {
    const f = queryPointsSource.data.features;
    const pointsInc = f.filter(x => x.properties.type === 'included').map(x => x.geometry.coordinates);
    const pointsExc = f.filter(x => x.properties.type !== 'included').map(x => x.geometry.coordinates);
    const included = pointsInc.reduce((v, point) => `${v},${point[0]},${point[1]}`, '').slice(1);
    const excluded = pointsExc.reduce((v, point) => `${v},${point[0]},${point[1]}`, '').slice(1);

    const currentQuery = datasetQueryNum++;
    // TODO: abort pending queries
    const response = await fetch(`https://mapsearch.curiosity.consulting/query?included=${included}&excluded=${excluded}&page=${pageNum}`);

    const results = await response.json();

    if (latestDatasetResultsNum > currentQuery) { return; } // Hack: discard late-arriving responses.
    latestDatasetResultsNum = currentQuery;

    if (!datasetQueryEnabledElem.checked) { return; } // Hack: disabled already, so discard any results.

    const features = results.map(x => ({
        "type": "Feature",
        "properties": { "type": x },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [x.bbox[0], x.bbox[1]],
                [x.bbox[2], x.bbox[1]],
                [x.bbox[2], x.bbox[3]],
                [x.bbox[0], x.bbox[3]],
                [x.bbox[0], x.bbox[1]],
            ]],
        },
    }));

    if (getLayer('dataset-query-results-outline')) { removeLayer('dataset-query-results-outline'); }
    getSource('dataset-query-results') && removeSource('dataset-query-results');
    directAddSource('dataset-query-results', {
        type: 'geojson',
        data: { "type": "FeatureCollection", features: features, },
    });

    directAddLayer({
        'id': 'dataset-query-results-outline',
        'source': 'dataset-query-results',
        'type': 'line',
        'paint': {
            'line-width': 2.5,
            'line-opacity': 0.5,
        },
        BEFORE: 'TOP',
    }, 'TOP');

    updateDatasetQueryResultsList(pageNum, results);
};

addMapEventHandler('click', addQueryPoint);
