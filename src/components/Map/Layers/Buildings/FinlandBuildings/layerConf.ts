import { Style as MbStyle } from 'mapbox-gl'

import { fillOpacity } from '#/common/utils/map'
import { LayerGroupId, LayerConf, ExtendedMbStyle } from '#/common/types/map'
import Popup from './Popup'

const id: LayerGroupId = 'fi_buildings'

const getStyle = async (): Promise<ExtendedMbStyle> => {
  return {
    version: 8,
    name: id,
    sources: {
      [id]: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/fi-buildings/{z}/{x}/{y}.pbf.gz'],
        minzoom: 6,
        maxzoom: 13,
        bounds: [19, 59, 32, 71], // Finland
      },
    },
    layers: [
      {
        id: id + '-fill',
        source: id,
        'source-layer': 'default',
        type: 'fill',
        paint: {
          'fill-color': 'cyan',
          'fill-opacity': fillOpacity,
        },
      },
      {
        id: id + '-outline',
        source: id,
        'source-layer': 'default',
        type: 'line',
        paint: {
          'line-opacity': 0.75,
        },
      },
    ],
  }
}

const layerConf: LayerConf = { id: id, style: getStyle, popup: Popup, useMb: true }

export default layerConf
