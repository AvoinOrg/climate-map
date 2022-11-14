import { Style as MbStyle } from 'mapbox-gl'
import _ from 'lodash'

import { fillOpacity, roundToSignificantDigits } from '#/utils/mapUtils'
import { LayerId, LayerConf } from 'Types/map'

const id: LayerId = 'hsy_solarpotential'

const getStyle = async (): Promise<MbStyle> => {
  return {
    version: 8,
    name: id,
    sources: {
      [id]: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/hsy-aurinkosahkopotentiaali/{z}/{x}/{y}.pbf'],
        minzoom: 1,
        maxzoom: 14,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="https://www.hsy.fi/">© HSY</a>',
      },
    },
    layers: [
      {
        id: id + '-fill',
        source: id,
        'source-layer': 'solarpower_potential',
        type: 'fill',
        paint: {
          'fill-color': ['case', ['has', 'ELEC'], ['case', ['<', 0, ['get', 'ELEC']], '#92b565', 'gray'], 'gray'],
          // areaCO2eFillColor(['*', 1e-3, ['get', 'CO2']]), // The variable CO2 is not documented at all!
          'fill-opacity': fillOpacity,
        },
        BEFORE: 'FILL',
      },
      {
        id: id + '-outline',
        source: id,
        'source-layer': 'solarpower_potential',
        type: 'line',
        minzoom: 11,
        // 'maxzoom': zoomThreshold,
        paint: {
          'line-opacity': 0.5,
        },
        BEFORE: 'OUTLINE',
      },
      {
        id: id + '-sym',
        source: id,
        'source-layer': 'solarpower_potential',
        type: 'symbol',
        minzoom: 17,
        // 'maxzoom': zoomThreshold,
        paint: {},
        layout: {
          'text-size': 20,
          'symbol-placement': 'point',
          'text-font': ['Open Sans Regular'],
          'text-field': [
            'case',
            ['has', 'ELEC'],
            [
              'case',
              ['<', 0, ['get', 'ELEC']],
              [
                'concat',
                // roundToSignificantDigits(2, ['*', 1e-3, ["get", "CO2"]]), // TODO: Get documentation for this!
                // "t CO2e/y",
                // "\nElectricity generation: ",
                roundToSignificantDigits(2, ['*', 1e-3, ['get', 'ELEC']]),
                ' MWh/year',
              ],
              '',
            ],
            '',
          ],
        },
        BEFORE: 'LABEL',
      },
    ],
  }
}

const layerConf: LayerConf = { id: id, style: getStyle }

export default layerConf
