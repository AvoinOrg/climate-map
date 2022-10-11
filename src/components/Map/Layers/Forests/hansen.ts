import { Style as MbStyle } from 'mapbox-gl'

import { LayerId, LayerConf } from 'Types/map'

const id: LayerId = 'hansen'
const gainlossId = 'hansen_gainloss'
const URL_PREFIX = `https://server.avoin.org/data/map/hansen/`

const getStyle = async (): Promise<MbStyle> => {
  return {
    version: 8,
    name: id,
    sources: {
      [id]: {
        type: 'raster',
        tiles: [URL_PREFIX + 'treecover/tiles/{z}/{x}/{y}.png'],
        maxzoom: 7,
        attribution:
          '<a href="https://developers.google.com/earth-engine/datasets/catalog/UMD_hansen_global_forest_change_2020_v1_8">Hansen/UMD/Google/USGS/NASAESA</a>',
      },
      [gainlossId]: {
        type: 'raster',
        tiles: [URL_PREFIX + 'gainloss/tiles/{z}/{x}/{y}.png'],
        maxzoom: 7,
        attribution:
          '<a href="https://developers.google.com/earth-engine/datasets/catalog/UMD_hansen_global_forest_change_2020_v1_8">Hansen/UMD/Google/USGS/NASAESA</a>',
      },
    },
    layers: [
      {
        id: id + '-raster',
        source: id,
        type: 'raster',
        minzoom: 0,
        paint: {
          'raster-opacity': 1,
        },
        BEFORE: 'FILL',
      },
      {
        id: gainlossId + '-raster',
        source: gainlossId,
        type: 'raster',
        minzoom: 0,
        paint: {
          'raster-opacity': 1,
        },
        BEFORE: 'FILL',
      },
    ],
  }
}

const layerConf: LayerConf = { id: id, style: getStyle }

export default layerConf
