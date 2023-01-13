import { Style as MbStyle, Expression } from 'mapbox-gl'

import { fillOpacity } from '#/utils/mapUtils'
import { LayerId, LayerConf } from '#/types/map'
import { layerOptions } from '#/app/app/fi-forest/constants'
import { fiForestsAreaCO2FillColor, fiForestsCumulativeCO2eValueExpr } from '#/app/app/fi-forest/utils'
import Popup from './Popup'

const SERVER_URL = process.env.NEXT_PUBLIC_GEOSERVER_URL

const id: LayerId = 'fi_forests'

const getStyle = async (): Promise<MbStyle> => {
  const sources: any = {}
  let layers: any = []

  for (const layerId in layerOptions) {
    const options = layerOptions[layerId]
    sources[layerId] = {
      type: 'vector',
      scheme: 'tms',
      tiles: [`${SERVER_URL}/gwc/service/tms/1.0.0/forest:${options.serverId}@EPSG:900913@pbf/{z}/{x}/{y}.pbf`],
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

const layerConf: LayerConf = { id: id, style: getStyle, popup: Popup, useMb: true }

export default layerConf
