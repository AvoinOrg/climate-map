// import { Style as MbStyle } from 'mapbox-gl'

import { fillOpacity, roundToSignificantDigitsExpr } from '#/common/utils/map'
import { LayerGroupId, LayerConf, ExtendedMbStyle } from '#/common/types/map'
import { layerOptions } from './constants'
import _ from 'lodash'

import Popup from './Popup'

const SERVER_URL = process.env.NEXT_PUBLIC_GEOSERVER_URL

const id: LayerGroupId = 'helsinki_buildings'

const getStyle = async (): Promise<ExtendedMbStyle> => {
  const sources: any = {}
  let layers: any = []

  for (const layerGroupId in layerOptions) {
    const options = layerOptions[layerGroupId]
    sources[layerGroupId] = {
      type: 'vector',
      scheme: 'tms',
      tiles: [`${SERVER_URL}/gwc/service/tms/1.0.0/misc:${options.serverId}@EPSG:900913@pbf/{z}/{x}/{y}.pbf`],
      minzoom: options.minzoom,
      maxzoom: options.maxzoom,
      bounds: [19, 59, 32, 71], // Finland
      attribution: '<a href="https://www.hel.fi">© City of Helsinki</a>',
      promoteId: 'id',
    }

    layers = [
      ...layers,
      {
        id: `${layerGroupId}-fill`,
        source: layerGroupId,
        'source-layer': options.serverId,
        type: 'fill',
        paint: {
          'fill-color': [
            'match',
            // ['get', 'c_poltaine'], '1', '#f0afaa', '2', '#f3bcb8', '3', '#f0afaa', '4', '#ffffff', '9', '#68c296',
            ['get', 'c_kayttark'],
            '032',
            'cyan',
            '039',
            'cyan',
            'gray', // fallback value
          ],
          'fill-opacity': fillOpacity,
        },
        // paint: {
        //  'fill-color': fiForestsAreaCO2FillColor(fiForestsCumulativeCO2eValueExpr),
        //  'fill-opacity': layerGroupId === 'parcel' ? 1 : fillOpacity,
        // },
        // ...(options.layerMinzoom != null && { minzoom: options.layerMinzoom }),
        // ...(options.layerMaxzoom != null && { maxzoom: options.layerMaxzoom }),
      },
      {
        id: `${layerGroupId}-outline`,
        source: layerGroupId,
        'source-layer': options.serverId,
        type: 'line',
        minzoom: 11,
        paint: {
          'line-opacity': 0.75,
        },
        // ...(options.layerMinzoom != null && { minzoom: options.layerMinzoom }),
        // ...(options.layerMaxzoom != null && { maxzoom: options.layerMaxzoom }),
      },
      {
        id: `${layerGroupId}-symbol`,
        source: layerGroupId,
        'source-layer': options.serverId,
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
        // ...(options.layerMinzoom != null && { minzoom: options.layerMinzoom }),
        // ...(options.layerMaxzoom != null && { maxzoom: options.layerMaxzoom }),
      },
    ]
  }
  return {
    version: 8,
    name: id,
    sources: sources,
    layers: layers,
  }
}

const layerConf: LayerConf = { id: id, style: getStyle, popup: Popup, useMb: true }

export default layerConf
