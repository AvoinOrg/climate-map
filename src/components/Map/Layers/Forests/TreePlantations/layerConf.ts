import { LayerGroupId, LayerConf, ExtendedMbStyle } from '#/common/types/map'
import { fillOpacity } from '#/common/utils/map'
import Popup from './Popup'

const id: LayerGroupId = 'gfw_tree_plantations'

const getStyle = async (): Promise<ExtendedMbStyle> => {
  return {
    version: 8,
    name: id,
    sources: {
      [id]: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/gfw_tree_plantations/{z}/{x}/{y}.pbf'],
        minzoom: 0,
        maxzoom: 12,
        attribution: '<a href="https://www.globalforestwatch.org/">© Global Forest Watch</a>',
      },
    },
    layers: [
      {
        id: id + '-fill',
        source: id,
        'source-layer': 'gfw_plantations',
        type: 'fill',
        paint: {
          'fill-color': ['case', ['<', 0.4, ['get', 'peat_ratio']], 'rgb(214, 7, 7)', 'rgb(109, 41, 7)'],
          'fill-opacity': fillOpacity,
        },
        BEFORE: 'FILL',
      },
      {
        id: id + '-outline',
        source: id,
        'source-layer': 'gfw_plantations',
        type: 'line',
        minzoom: 9,
        paint: {
          'line-opacity': 0.5,
        },
        BEFORE: 'OUTLINE',
      },
      {
        id: id + '-symbol',
        source: id,
        'source-layer': 'gfw_plantations',
        type: 'symbol',
        minzoom: 14,
        paint: {},
        layout: {
          'text-size': 20,
          'symbol-placement': 'point',
          'text-font': ['Open Sans Regular'],
          'text-field': ['get', 'spec3'],
        },
        BEFORE: 'LABEL',
      },
    ],
  }
}

const layerConf: LayerConf = { id: id, style: getStyle, popup: Popup, useMb: true }

export default layerConf
