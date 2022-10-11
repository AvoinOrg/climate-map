import { Style as MbStyle, Expression } from 'mapbox-gl'

import { LayerId, LayerConf } from 'Types/map'
import { fillOpacity } from 'Utils/mapUtils'

const id: LayerId = 'metsaan_ete_basic'

const eteBasicLabels: Expression = [
  'match',
  ['get', 'featurecode'],
  70,
  'Gamekeeping area',
  95,
  'Potential METSO Habitat',
  98,
  'METSO Habitat',
  10120,
  'Gamekeeping area',
  15150,
  'METSO II',
  '',
]

const getStyle = async (): Promise<MbStyle> => {
  return {
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
          'text-field': eteBasicLabels,
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
}

const layerConf: LayerConf = { id: id, style: getStyle }

export default layerConf
