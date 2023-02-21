import { fillOpacity, roundToSignificantDigitsExpr } from '#/common/utils/map'
import { LayerId, LayerConf, ExtendedMbStyle } from '#/common/types/map'
import Popup from './Popup'

const id: LayerId = 'helsinki_buildings'

const getStyle = async (): Promise<ExtendedMbStyle> => {
  const sourceNames = ['helsinki_buildings', 'helsinki_puretut']

  return {
    version: 8,
    name: id,
    sources: {
      [sourceNames[0]]: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/helsinki-buildings/{z}/{x}/{y}.pbf'],
        maxzoom: 14,
        // Bounds source: https://koordinates.com/layer/4257-finland-11000000-administrative-regions/
        // select ST_Extent(ST_Transform(ST_SetSRID(geom,3067), 4326))
        // from "finland-11000000-administrative-regions" where kunta_ni1='Helsinki';
        bounds: [24, 59, 26, 61],
        attribution: '<a href="https://www.hel.fi">© City of Helsinki</a>',
      },
      [sourceNames[1]]: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/hel-puretut/{z}/{x}/{y}.pbf.gz?v=0'],
        maxzoom: 14,
        // Bounds source: https://koordinates.com/layer/4257-finland-11000000-administrative-regions/
        // select ST_Extent(ST_Transform(ST_SetSRID(geom,3067), 4326))
        // from "finland-11000000-administrative-regions" where kunta_ni1='Helsinki';
        bounds: [24, 59, 26, 61],
        attribution: '<a href="https://www.hel.fi">© City of Helsinki</a>',
      },
    },
    layers: [
      {
        id: sourceNames[0] + '-fill',
        source: sourceNames[0],
        'source-layer': 'Rakennukset_alue',
        type: 'fill',
        paint: {
          'fill-color': 'cyan',
          'fill-opacity': fillOpacity,
        },
      },
      {
        id: sourceNames[0] + '-outline',
        source: sourceNames[0],
        'source-layer': 'Rakennukset_alue',
        type: 'line',
        minzoom: 11,
        paint: {
          'line-opacity': 0.75,
        },
      },
      {
        id: sourceNames[0] + '-co2',
        source: sourceNames[0],
        'source-layer': 'Rakennukset_alue',
        type: 'symbol',
        minzoom: 16,
        paint: {},
        layout: {
          'symbol-placement': 'point',
          'text-font': ['Open Sans Regular'],
          'text-size': 20,
          'text-field': [
            'case',
            ['has', 'i_raktilav'],
            [
              'let',
              'co2',
              ['/', ['*', 15, ['to-number', ['get', 'i_raktilav'], 0]], 1000],
              [
                'concat',
                roundToSignificantDigitsExpr(2, ['var', 'co2']), // kg -> tons
                ' t CO2e/y',
              ],
            ],
            '',
          ],
        },
      },
      {
        id: sourceNames[1] + '-fill',
        source: sourceNames[1],
        'source-layer': 'default',
        type: 'fill',
        paint: {
          'fill-color': 'black',
          'fill-opacity': fillOpacity,
        },
      },
      {
        id: sourceNames[1] + '-outline',
        source: sourceNames[1],
        'source-layer': 'default',
        type: 'line',
        minzoom: 11,
        paint: {
          'line-opacity': 0.75,
        },
      },
      {
        id: sourceNames[1] + '-sym',
        source: sourceNames[1],
        'source-layer': 'default',
        type: 'symbol',
        minzoom: 16,
        paint: {},
        layout: {
          'symbol-placement': 'point',
          'text-font': ['Open Sans Regular'],
          'text-size': 20,
          'text-field': '',
        },
      },
    ],
  }
}

const layerConf: LayerConf = { id: id, style: getStyle, popup: Popup }

export default layerConf
