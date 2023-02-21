import { Style as MbStyle } from 'mapbox-gl'

import { fillOpacity } from '#/common/utils/map'
import { LayerId, LayerConf, ExtendedMbStyle } from '#/common/types/map'
import Popup from './Popup'

const id: LayerId = 'building_energy_certs'

const getStyle = async (): Promise<ExtendedMbStyle> => {
  return {
    version: 8,
    name: id,
    sources: {
      [id]: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/hel-energiatodistukset/{z}/{x}/{y}.pbf?v=3'],
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
        'source-layer': 'energiatodistukset',
        type: 'fill',
        paint: {
          'fill-color': [
            'match',
            ['get', 'e_luokka'],
            'A',
            '#1F964A',
            'B',
            '#7DAD46',
            'C',
            '#CCD040',
            'D',
            '#FFEA43',
            'E',
            '#ECB234',
            'F',
            '#D2621F',
            'G',
            '#C70016',
            'white',
          ],
          'fill-opacity': fillOpacity,
        },
        BEFORE: 'FILL',
      },
      {
        id: id + '-outline',
        source: id,
        'source-layer': 'energiatodistukset',
        type: 'line',
        minzoom: 11,
        paint: {
          'line-opacity': 0.75,
        },
        BEFORE: 'OUTLINE',
      },
      {
        id: id + '-sym',
        source: id,
        'source-layer': 'energiatodistukset',
        type: 'symbol',
        minzoom: 14,
        paint: {},
        layout: {
          'symbol-placement': 'point',
          'text-font': ['Open Sans Regular'],
          'text-size': 20,
          'text-field': ['case', ['has', 'e_luokka'], ['get', 'e_luokka'], ''],
        },
        BEFORE: 'LABEL',
      },
    ],
  }
}

const layerConf: LayerConf = { id: id, style: getStyle, popup: Popup }

export default layerConf
