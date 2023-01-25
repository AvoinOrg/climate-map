import { Style as MbStyle } from 'mapbox-gl'

import { LayerId, LayerConf } from '#/common/types/map'

const id: LayerId = 'cifor_peatdepth'

const getStyle = async (): Promise<MbStyle> => {
  return {
    version: 8,
    name: id,
    sources: {
      [id]: {
        type: 'raster',
        tiles: ['https://server.avoin.org/data/map/cifor/TROP-SUBTROP_PeatDepthV2_2016_CIFOR/{z}/{x}/{y}.png?v=3'],
        bounds: [-180, -60, 180, 40],
        minzoom: 0,
        maxzoom: 10,
        attribution: '<a href="https://www.cifor.org/">© Center for International Forestry Research (CIFOR)</a>',
      },
    },
    layers: [
      {
        id: id + '-raster',
        source: id,
        type: 'raster',
        paint: {
          'raster-opacity': 0.7,
        },
      },
    ],
  }
}

const layerConf: LayerConf = { id: id, style: getStyle }

export default layerConf
