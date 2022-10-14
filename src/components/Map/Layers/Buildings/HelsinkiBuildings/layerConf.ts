import { Style as MbStyle } from 'mapbox-gl'
import _ from 'lodash'

import { fillOpacity, roundToSignificantDigits } from 'Utils/mapUtils'
import { LayerId, LayerConf } from 'Types/map'
import Popup from './Popup'

const id: LayerId = 'helsinki_buildings'
const idDemolished: string = 'helsinki_puretut'

const getStyle = async (): Promise<MbStyle> => {
  return {
    version: 8,
    name: id,
    sources: {
      [id]: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/helsinki-buildings/{z}/{x}/{y}.pbf'],
        maxzoom: 14,
        // Bounds source: https://koordinates.com/layer/4257-finland-11000000-administrative-regions/
        // select ST_Extent(ST_Transform(ST_SetSRID(geom,3067), 4326))
        // from "finland-11000000-administrative-regions" where kunta_ni1='Helsinki';
        bounds: [24, 59, 26, 61],
        attribution: '<a href="https://www.hel.fi">© City of Helsinki</a>',
      },
      [idDemolished]: {
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
        id: id + '-fill',
        source: id,
        'source-layer': 'Rakennukset_alue',
        type: 'fill',
        paint: {
          'fill-color': 'cyan',
          'fill-opacity': fillOpacity,
        },
        BEFORE: 'FILL',
      },
      {
        id: id + '-outline',
        source: id,
        'source-layer': 'Rakennukset_alue',
        type: 'line',
        minzoom: 11,
        paint: {
          'line-opacity': 0.75,
        },
        BEFORE: 'OUTLINE',
      },
      {
        id: id + '-co2',
        source: id,
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
                roundToSignificantDigits(2, ['var', 'co2']), // kg -> tons
                ' t CO2e/y',
              ],
            ],
            '',
          ],
        },
        BEFORE: 'LABEL',
      },
      {
        id: idDemolished + '-fill',
        source: idDemolished,
        'source-layer': 'default',
        type: 'fill',
        paint: {
          'fill-color': 'red',
          'fill-opacity': fillOpacity,
        },
        BEFORE: 'FILL',
      },
      {
        id: idDemolished + '-outline',
        source: idDemolished,
        'source-layer': 'default',
        type: 'line',
        minzoom: 11,
        paint: {
          'line-opacity': 0.75,
        },
        BEFORE: 'OUTLINE',
      },
      {
        id: idDemolished + '-sym',
        source: idDemolished,
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
        BEFORE: 'LABEL',
      },
    ],
  }
}

const layerConf: LayerConf = { id: id, style: getStyle, popup: Popup }

export default layerConf
