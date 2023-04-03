"use client"

import { LayerId, LayerConf, ExtendedMbStyle } from '#/common/types/map'

const id: LayerId = 'no2'

// TODO: Figure out what the tilesets are, and how the timestampHour affects the tiles
// const no2Tileset = Number.parseInt(window.location.search.substring(1), 10) || 0
const no2Tileset = 0
const timestampHour = Math.round(+new Date() / 1e6)

const getStyle = async (): Promise<ExtendedMbStyle> => {
  return {
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
      },
    ],
  }
}

const layerConf: LayerConf = { id: id, style: getStyle, useMb: true }

export default layerConf
