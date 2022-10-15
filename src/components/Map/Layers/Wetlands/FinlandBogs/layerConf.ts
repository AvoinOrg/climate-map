import { Style as MbStyle } from 'mapbox-gl'
import _ from 'lodash'

import { fillOpacity } from 'Utils/mapUtils'
import { LayerId, LayerConf } from 'Types/map'
import Popup from './Popup'

const id: LayerId = 'fi_bogs'
const idGtk: string = 'gtk_peat'

const getStyle = async (): Promise<MbStyle> => {
  return {
    version: 8,
    name: id,
    sources: {
      [id]: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/fi-mml-suot/{z}/{x}/{y}.pbf.gz?v=5'],
        minzoom: 0,
        maxzoom: 11,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="http://mml.fi/">© National Land Survey of Finland</a>',
      },
      [idGtk]: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/gtk-turvevarat-suot/{z}/{x}/{y}.pbf.gz?v=5'],
        minzoom: 0,
        maxzoom: 14,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="http://www.gtk.fi/">© Geological Survey of Finland</a>',
      },
    },
    layers: [
      {
        id: id + '-fill',
        source: id,
        'source-layer': 'default',
        type: 'fill',
        paint: {
          'fill-color': 'orange',
          'fill-opacity': fillOpacity,
        },
        BEFORE: 'FILL',
      },
      {
        id: idGtk + '-fill',
        source: idGtk,
        'source-layer': 'default',
        type: 'fill',
        paint: {
          'fill-color': ['case', ['==', null, ['get', 'photos_json']], 'red', 'orange'],
          // 'fill-color': fillColorFertilityClass,
          // 'fill-color': fillRegenerationFelling,
          'fill-opacity': fillOpacity,
        },
        BEFORE: 'FILL',
      },
    ],
  }
}

const layerConf: LayerConf = { id: id, style: getStyle, popup: Popup }

export default layerConf
