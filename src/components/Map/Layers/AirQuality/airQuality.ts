import { Style as MbStyle } from 'mapbox-gl'

import { LayerId, LayerConf } from 'Types/map'

const id: LayerId = 'no2'

const no2Tileset = Number.parseInt(window.location.search.substring(1), 10) || 0
const timestampHour = Math.round(+new Date() / 1e6)

const style: MbStyle = {
  version: 8,
  name: id,
  sources: {
    [id]: {
      type: 'raster',
      tiles: [
        'https://server.avoin.org/data/map/atmoshack/mbtiles-dump/' +
          no2Tileset +
          '/{z}/{x}/{y}.png?v=5&_=' +
          timestampHour,
      ],
      maxzoom: 5,
      attribution: '<a href="https://www.esa.int/ESA">ESA</a>',
    },
  },
  layers: [
    {
      id: id + '-raster',
      source: 'no2',
      type: 'raster',
      minzoom: 0,
      maxzoom: 10,
      paint: {
        'raster-opacity': 0.7,
      },
      BEFORE: 'FILL',
    },
  ],
}

const layerConf: LayerConf = { id: id, style: style }

export default layerConf