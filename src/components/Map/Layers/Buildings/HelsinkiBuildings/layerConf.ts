import { Style as MbStyle } from 'mapbox-gl'

import _ from 'lodash'

import { fillOpacity, roundToSignificantDigits } from '#/utils/mapUtils'
import { LayerId, LayerConf } from '#/types/map'
import { layerOptions } from './constants'
import Popup from './Popup'

const SERVER_URL = process.env.NEXT_PUBLIC_GEOSERVER_URL

const id: LayerId = 'helsinki_buildings'

const getStyle = async (): Promise<MbStyle> => {
  const sources: any = {}
  let layers: any = []

  for (const layerId in layerOptions) {
    const options = layerOptions[layerId]
    sources[layerId] = {
      type: 'raster',
      scheme: 'tms',      
      tiles: [`${SERVER_URL}/gwc/service/tms/1.0.0/misc:${options.serverId}@EPSG:900913@pbf/{z}/{x}/{y}.pbf`],
      // tiles: [`${SERVER_URL}/gwc/service/tms/1.0.0/misc:${options.serverId}@pbf/{z}/{x}/{y}.pbf`],
      minzoom: options.minzoom,
      maxzoom: options.maxzoom,
      bounds: [19, 59, 32, 71], // Finland
      attribution: '<a href="https://www.hel.fi">© City of Helsinki</a>',
      promoteId: 'id',
    }

    layers = [
      ...layers,
      {
        id: `${layerId}-fill`,
        source: layerId,
        'source-layer': options.serverId,
        type: 'fill',
        paint: {
          'fill-color': 'cyan',
          'fill-opacity': fillOpacity,
        },
        BEFORE: 'FILL',
      },
      {
        id: `${layerId}-outline`,
        source: layerId,
        'source-layer': options.serverId,
        type: 'line',
        minzoom: 0,
        paint: {
          'line-opacity': 0.75,
        },
        BEFORE: 'OUTLINE',
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

const layerConf: LayerConf = { id: id, style: getStyle, popup: Popup }

export default layerConf


