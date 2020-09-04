import { directAddSource, directAddLayer, getLayer } from '../map';

interface IProperties {
    tpteksti: string;
    tunnus: string;
}
interface IFeature {
    properties: IProperties;
    geometry: GeoJSON.Point;
}
interface IGeoJSON {
    features: IFeature[];
}

export const queryKiinteistoTunnus = async (query: string) => {
    const q = query
        .replace(/\([^)]*\)/g, '')
        .replace(/\[[^\]]*\]/g, '')
        .split('#')[0]
        .trim()
        // Normalize 010-0042-0001-0001 -> 010-42-1-1
        .replace(/-0+/g, '-')
        .replace(/-$/, '')
        ;

    // Valid formats for kiinteistötunnus (property identifier): 00589500020002 or 5-895-2-2
    const re = /^([0-9]{1,3})(-[0-9]+){1,3}$/.exec(q) || /^([0-9]{3})[0-9]{11}$/.exec(q)
    if (!re) return { matches: 0 };

    // NB: prefix3 is not "ktunnus".
    // The prefix used to be equivalent to ktunnus but nowadays it is an opaque number.
    const prefix3 = re[1].padStart(3, '0'); // '5' -> '005'
    const today = new Date().toISOString().slice(0, 10)
    const response = await fetch(`https://map.buttonprogram.org/kiinteistorekisteri/lookup/${prefix3}.geojson.gz?_=${today}`);
    const geojson = await response.json() as IGeoJSON;
    let fs = geojson.features
    .filter(f => f.properties && (
        f.properties.tpteksti.startsWith(q)
        || f.properties.tunnus.startsWith(q)))

    let exact = false;
    // Display the closest possible match:
    if (fs.filter(f => f.properties.tpteksti === q).length > 0) {
        fs = fs.filter(f => f.properties.tpteksti === q);
        exact = true;
    }
    if (fs.filter(f => f.properties.tunnus === q).length > 0) {
        fs = fs.filter(f => f.properties.tunnus === q);
        exact = true;
    }
    const coords = fs.map(f => f.geometry.coordinates);

    if (coords.length === 0) return { matches: 0 };

    const bounds = coords
        .reduce(
            ([a, b, c, d], [lon, lat]) =>
                [Math.min(lon, a), Math.min(lat, b), Math.max(lon, c), Math.max(lat, d)]
            , coords[0].concat(coords[0]) // Initial value
        );

    return { nQuery: q, bounds, matches: coords.length, fs, sampleId: fs[0].properties.tpteksti, exact }
}

export const enableMMLPalstatLayer = () => {
    if (getLayer('fi-mml-palstat-outline')) { return; }

    directAddSource('fi-mml-palstat', {
        "type": "vector",
        "tiles": ["https://map.buttonprogram.org/palstat/{z}/{x}/{y}.pbf.gz?v=0"],
        "minzoom": 14,
        "maxzoom": 14,
        bounds: [19, 59, 32, 71], // Finland
    });

    directAddLayer({
        'id': 'fi-mml-palstat-outline',
        'source': 'fi-mml-palstat',
        'source-layer': 'default',
        'type': 'line',
        'paint': {
            'line-opacity': 0.7,
            'line-width': 2,
        },
        BEFORE: 'OUTLINE',
    }, 'OUTLINE')

    directAddLayer({
        'id': 'fi-mml-palstat-sym',
        'source': 'fi-mml-palstat',
        'source-layer': 'default',
        'type': 'symbol',
        "paint": {},
        "layout": {
            "text-size": 20,
            "symbol-placement": "point",
            "text-font": ["Open Sans Regular"],
            "text-field": ['get', 'tpteksti'],
        },
        BEFORE: 'LABEL',
    }, 'LABEL')


    directAddLayer({
        'id': 'fi-mml-palstat-highlighted',
        'source': 'fi-mml-palstat',
        'source-layer': 'default',
        'type': 'fill',
        "paint": {
          "fill-outline-color": "#484896",
          "fill-color": "#6e599f",
          "fill-opacity": 0.2,
      },
      "filter": ["in", 'tpteksti'],
      BEFORE: 'OUTLINE',
    }, 'FILL')



}

export const kiinteistorekisteriTunnusGeocoder = async (query: string) => {
    const { nQuery, bounds, matches, fs, sampleId, exact } = await queryKiinteistoTunnus(query);
    if (matches === 0) return [];

    if (matches === 1) return [{
        place_name: `[P] ${sampleId}`,
        center: bounds!.slice(0, 2),
    }];

    // Multiple exact matches:
    // These may be road segments OR some other properties
    // scattered around in geographically discontiguous parts.
    if (exact) {
        const rePart = /#([0-9]+)/.exec(query);
        const queryPartNumber = rePart ? +rePart[1] : null;

        const res: Object[] = [{
            place_name: `[P] ${nQuery} (All parts, total:${matches})`,
            bbox: bounds,
        }];

        const parts = fs!
            .map((f, i) => ({
                partNumber: i + 1,
                place_name: `[P] ${f.properties.tpteksti} #${i + 1}`,
                center: f.geometry.coordinates,
            }))
            .filter(f => queryPartNumber === null || ("" + f.partNumber).startsWith("" + queryPartNumber))

        return res.concat(parts);
    }

    // Multiple partial matches (e.g. matching prefix like "5-2" for "5-2-9901-2" etc.)
    const results: Object[] = fs!
        .map(f => ({
            place_name: `[P] ${f.properties.tpteksti}`,
            center: f.geometry.coordinates,
        }))

    const resultsHeader: Object[] = [{
        place_name: `[P] ${nQuery} (${matches} matching properties)`,
        bbox: bounds,
    }]

    return resultsHeader.concat(results);
}
