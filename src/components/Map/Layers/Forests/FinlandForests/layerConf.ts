import { Style as MbStyle, Expression } from 'mapbox-gl'

import { fillOpacity } from '#/utils/mapUtils'
import { LayerId, LayerConf } from '#/types/map'

const SERVER_URL = process.env.NEXT_PUBLIC_GEOSERVER_URL

const id: LayerId = 'fi_forests'

interface ILayerOption {
  minzoom: number
  maxzoom?: number
  serverId: string
}

interface ILayerOptions {
  [s: string]: ILayerOption
}

const layerOptions: ILayerOptions = {
  fi_forests_country: { minzoom: 0, maxzoom: 5, serverId: 'country' },
  fi_forests_region: { minzoom: 5, maxzoom: 7, serverId: 'region' },
  fi_forests_municipality: { minzoom: 7, maxzoom: 12, serverId: 'municipality' },
  fi_forests_estate: { minzoom: 12, maxzoom: 14, serverId: 'estate' },
  fi_forests_parcel: { minzoom: 14, maxzoom: 16, serverId: 'parcel' },
}

const colorboxStepsNeg = ['#FFEC42', '#FDF259', '#FCF670', '#F0F596']

const stepsToLinear = (min: number, max: number, steps: string[]) => {
  const step = (max - min) / (steps.length - 1)
  const res: any[] = []
  let cur = min
  for (const s of steps) {
    res.push(cur)
    res.push(s)
    cur += step
  }
  return res
}

export const fiForestsAreaCO2FillColor: (expr: Expression) => Expression = (expr) => [
  'interpolate',
  ['linear'],
  expr,
  ...stepsToLinear(-5, 0, colorboxStepsNeg).concat([0.01, 'hsla(159, 100%, 50%, 1)', 15, 'hsla(159, 100%, 25%, 1)']),
]

export const fiForestsSumMethodAttrs: (method: number | Expression, attrPrefix: string) => Expression = (
  method,
  attrPrefix
) => [
  'let',
  'p',
  ['concat', 'm', method, '_'],
  [
    '*',
    1 / 50,
    [
      '+',
      ['get', ['concat', ['var', 'p'], `${attrPrefix}1`]],
      ['get', ['concat', ['var', 'p'], `${attrPrefix}2`]],
      ['get', ['concat', ['var', 'p'], `${attrPrefix}3`]],
      ['get', ['concat', ['var', 'p'], `${attrPrefix}4`]],
      ['get', ['concat', ['var', 'p'], `${attrPrefix}5`]],
    ],
  ],
]

export const fiForestsBestMethodCumulativeSumCbt = fiForestsSumMethodAttrs(['get', 'best_method'], 'cbt')

export const fiForestsCumulativeCO2eValueExpr = fiForestsBestMethodCumulativeSumCbt

const getStyle = async (): Promise<MbStyle> => {
  const sources: any = {}
  let layers: any = []

  for (const layerId in layerOptions) {
    const options = layerOptions[layerId]
    sources[layerId] = {
      type: 'vector',
      scheme: 'tms',
      tiles: [
        `${SERVER_URL}/gwc/service/tms/1.0.0/forest:${options.serverId}@EPSG:900913@pbf/{z}/{x}/{y}.pbf`,
      ],
      minzoom: options.minzoom,
      maxzoom: options.maxzoom,
      bounds: [19, 59, 32, 71], // Finland
      attribution: '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
    }

    layers = [
      ...layers,
      {
        id: `${layerId}-fill`,
        source: layerId,
        'source-layer': options.serverId,
        type: 'fill',
        paint: {
          'fill-color': fiForestsAreaCO2FillColor(fiForestsCumulativeCO2eValueExpr),
          'fill-opacity': layerId === 'parcel' ? 1 : fillOpacity,
        },
        minzoom: options.minzoom,
        maxzoom: options.maxzoom,
        BEFORE: 'FILL',
      },
      {
        id: `${layerId}-boundary`,
        source: layerId,
        'source-layer': options.serverId,
        type: 'line',
        paint: {
          'line-opacity': 0.5,
        },
        minzoom: options.minzoom,
        maxzoom: options.maxzoom,
        BEFORE: 'OUTLINE',
      },
      {
        id: `${layerId}-highlighted`,
        source: layerId,
        'source-layer': options.serverId,
        type: 'fill',
        paint: {
          'fill-outline-color': '#484896',
          'fill-color': '#6e599f',
          'fill-opacity': 0.4,
        },
        filter: ['in', options.serverId],
        BEFORE: 'OUTLINE',
        minzoom: options.minzoom,
        maxzoom: options.maxzoom,
      },
    ]
  }
  return {
    version: 8,
    name: id,
    sources: sources,
    layers: layers,
  }
}

const layerConf: LayerConf = { id: id, style: getStyle, useGL: true }

export default layerConf
