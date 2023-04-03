import { Expression } from 'mapbox-gl'

import { LayerId, LayerConf, ExtendedMbStyle } from '#/common/types/map'
import { metsaanFiTreeSpecies } from './constants'
import Popup from './Popup'

const id: LayerId = 'fi_mature_forests'

const fillRegenerationFelling: Expression = [
  'case',
  ['>=', 0.5, ['get', 'regeneration_felling_prediction']],
  'rgba(73, 25, 2320, 0.65)',
  'rgba(206, 244, 66, 0.35)',
]

const treeSpeciesText = (speciesId: any) => [
  'match',
  speciesId,
  ...Object.entries(metsaanFiTreeSpecies).reduce((x: any, y) => [...x, +y[0], y[1]], []),
  'Unknown',
]

const getStyle = async (): Promise<ExtendedMbStyle> => {
  const sourceNames = ['metsaan_stand', 'metsaan_stand_mature']

  return {
    version: 8,
    name: id,
    sources: {
      [sourceNames[0]]: {
        type: 'vector',
        tiles: ['https://server.avoin.org/data/map/stand2/{z}/{x}/{y}.pbf.gz?v=2'],
        minzoom: 12,
        maxzoom: 13,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
      },
      [sourceNames[1]]: {
        type: 'raster',
        tiles: ['https://server.avoin.org/data/map/stand2-mature/{z}/{x}/{y}.png'],
        tileSize: 512,
        maxzoom: 12,
        bounds: [19, 59, 32, 71], // Finland
        attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
      },
    },
    layers: [
      {
        id: sourceNames[0] + '-fill',
        source: sourceNames[0],
        'source-layer': 'stand',
        type: 'fill',
        minzoom: 12,
        paint: {
          // 'fill-color': fillColorFertilityClass,
          'fill-color': fillRegenerationFelling,
          // 'fill-opacity': fillOpacity, // Set by fill-color rgba
        },
      },
      {
        id: sourceNames[1] + '-raster',
        source: sourceNames[1],
        type: 'raster',
        minzoom: 0,
        maxzoom: 12,
      },
      {
        id: sourceNames[0] + '-symbol',
        source: sourceNames[0],
        'source-layer': 'stand',
        type: 'symbol',
        minzoom: 15.5,
        // 'maxzoom': zoomThreshold,
        paint: {},
        layout: {
          'text-size': 20,
          'symbol-placement': 'point',
          'text-font': ['Open Sans Regular'],
          'text-field': [
            'concat',
            'Main species: ',
            treeSpeciesText(['get', 'maintreespecies']),
            '\navg.age: ',
            ['get', 'meanage'],
            '\navg.diameter: ',
            ['get', 'meandiameter'],
            ' cm',
          ],
        },
      },
    ],
  }
}

const layerConf: LayerConf = { id: id, style: getStyle, popup: Popup, useMb: true }

export default layerConf
