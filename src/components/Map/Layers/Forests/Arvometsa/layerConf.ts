import { Style as MbStyle, Expression } from 'mapbox-gl'

import { LayerId, LayerConf } from '#/types/map'
import { metsaanFiTreeSpecies } from './constants'
import Popup from './Popup'

const id: LayerId = 'fi_arvometsa'

const getStyle = async (): Promise<MbStyle> => {
  const sourceNames = ['arvometsa']

  return {
    version: 8,
    name: id,
    sources: {
      [sourceNames[0]]: {
        type: 'vector',
        tiles: [`https://server.avoin.org/data/map/arvometsa/{z}/{x}/{y}.pbf.gz?v=0`],
        minzoom: 13,
        maxzoom: 14,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
      },
      // [sourceNames[1]]: {
      //   type: 'raster',
      //   tiles: ['https://server.avoin.org/data/map/stand2-mature/{z}/{x}/{y}.png'],
      //   tileSize: 512,
      //   maxzoom: 12,
      //   bounds: [19, 59, 32, 71], // Finland
      //   attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
      // },
    },
    layers: [
      {
        id: `arvometsa-fill`,
        source: 'arvometsa',
        type: 'fill',
      },
      // 'paint': {
      //   'fill-color':
      //   'fill-opacity': ['arvometsa'].indexOf(type) === -1 ? fillOpacity : 1,
      // },
      // minzoom: opts.minzoom,
      // maxzoom: opts.maxzoom || 24,
      // BEFORE: 'FILL',
      // ...extraOpts,
    ],
  }
}

const layerConf: LayerConf = { id: id, style: getStyle, popup: Popup }

export default layerConf
