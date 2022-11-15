import axios from 'axios'
import { Style as MbStyle, Expression } from 'mapbox-gl'

import { LayerId, LayerConf } from '#/types/map'
import { fillOpacity } from '#/utils/mapUtils'

const id: LayerId = 'metsaan_ete_important'

const getStyle = async (): Promise<MbStyle> => {
  const { data } = await axios.get('ete_codes.json')

  const eteAllLabels = ['match', ['get', 'featurecode'], ...data, 'UNKNOWN habitat type'] as Expression

  const style: MbStyle = {
    version: 8,
    name: id,
    sources: {
      [id]: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/metsaan-ete/{z}/{x}/{y}.pbf'],
        maxzoom: 12,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
      },
    },
    layers: [
      {
        id: id + `-fill`,
        source: id,
        'source-layer': 'metsaan-ete',
        type: 'fill',
        paint: {
          'fill-color': 'cyan',
          'fill-opacity': fillOpacity,
        },
        BEFORE: 'FILL',
      },
      {
        id: id + `-outline`,
        source: id,
        'source-layer': 'metsaan-ete',
        type: 'line',
        minzoom: 12,
        paint: {
          'line-opacity': 1,
        },
        BEFORE: 'OUTLINE',
      },
      {
        id: id + '-sym',
        source: id,
        'source-layer': 'metsaan-ete',
        type: 'symbol',
        layout: {
          'text-font': ['Open Sans Regular'],
          'text-field': eteAllLabels,
        },
        paint: {
          'text-color': '#999',
          'text-halo-blur': 1,
          'text-halo-color': 'rgb(242,243,240)',
          'text-halo-width': 2,
        },
        BEFORE: 'LABEL',
      },
    ],
  }

  return style
}

const layerConf: LayerConf = { id: id, style: getStyle }

export default layerConf
