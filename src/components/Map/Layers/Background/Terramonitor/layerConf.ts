import { Expression } from 'mapbox-gl'

import { LayerId, LayerConf, ExtendedMbStyle } from '#/common/types/map'

const id: LayerId = 'terramonitor'

const getStyle = async (): Promise<ExtendedMbStyle> => {
  return {
    version: 8,
    name: id,
    sources: {
      [id]: {
        type: 'raster',
        tiles: [`https://tm2.terramonitor.com/${process.env.NEXT_PUBLIC_TERRAMONITOR_KEY}/rgb/{z}/{x}/{y}.png`],
        tileSize: 256,
        attribution: '<a href="https://www.terramonitor.com">© Terramonitor</a>',
      },
    },
    layers: [
      {
        id: 'terramonitor',
        source: 'terramonitor',
        type: 'raster',
        paint: {},
        BEFORE: 'BACKGROUND',
      },
    ],
  }
}

const layerConf: LayerConf = { id: id, style: getStyle, useMb: true }

export default layerConf
