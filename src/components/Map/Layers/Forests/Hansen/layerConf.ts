import { Style as MbStyle } from 'mapbox-gl'

import { LayerId, LayerConf } from 'Types/map'

const id: LayerId = 'hansen'

const URL_PREFIX = `https://server.avoin.org/data/map/hansen/`

const getStyle = async (): Promise<MbStyle> => {
  const sourceNames = ['hansen-treecover', 'hansen-gainloss']

  return {
    version: 8,
    name: id,
    sources: {
      [sourceNames[0]]: {
        type: 'raster',
        tiles: [URL_PREFIX + 'treecover/tiles/{z}/{x}/{y}.png'],
        maxzoom: 7,
        attribution:
          '<a href="https://developers.google.com/earth-engine/datasets/catalog/UMD_hansen_global_forest_change_2020_v1_8">Hansen/UMD/Google/USGS/NASAESA</a>',
      },
      [sourceNames[1]]: {
        type: 'raster',
        tiles: [URL_PREFIX + 'gainloss/tiles/{z}/{x}/{y}.png'],
        maxzoom: 7,
        attribution:
          '<a href="https://developers.google.com/earth-engine/datasets/catalog/UMD_hansen_global_forest_change_2020_v1_8">Hansen/UMD/Google/USGS/NASAESA</a>',
      },
    },
    layers: [
      {
        id: sourceNames[0] + '-raster',
        source: sourceNames[0],
        type: 'raster',
        minzoom: 0,
        paint: {
          'raster-opacity': 1,
        },
        BEFORE: 'FILL',
      },
      {
        id: sourceNames[1] + '-raster',
        source: sourceNames[1],
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
