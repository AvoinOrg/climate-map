import { fillOpacity } from '#/common/utils/map'
import { LayerGroupId, LayerConf, ExtendedMbStyle } from '#/common/types/map'
import Popup from './Popup'

const id: LayerGroupId = 'fi_bogs'

const getStyle = async (): Promise<ExtendedMbStyle> => {
  const sourceNames = ['fi_bogs', 'gtk_peat']

  return {
    version: 8,
    name: id,
    sources: {
      [sourceNames[0]]: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/fi-mml-suot/{z}/{x}/{y}.pbf.gz?v=5'],
        minzoom: 0,
        maxzoom: 11,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="http://mml.fi/">© National Land Survey of Finland</a>',
      },
      [sourceNames[1]]: {
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
        id: sourceNames[0] + '-fill',
        source: sourceNames[0],
        'source-layer': 'default',
        type: 'fill',
        paint: {
          'fill-color': 'orange',
          'fill-opacity': fillOpacity,
        },
        BEFORE: 'FILL',
      },
      {
        id: sourceNames[1] + '-fill',
        source: sourceNames[1],
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

const layerConf: LayerConf = { id: id, style: getStyle, popup: Popup, useMb: true }

export default layerConf
