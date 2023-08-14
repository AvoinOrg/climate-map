import { Expression } from 'mapbox-gl'

import { fillOpacity } from '#/common/utils/map'
import { LayerGroupId, LayerConf, ExtendedMbStyle } from '#/common/types/map'
import { layerOptions } from 'applets/fi-forest/constants'
import { LayerLevel } from 'applets/fi-forest/types'
import {
  fiForestsAreaCO2FillColor,
  fiForestsCumulativeCO2eValueExpr,
  fiForestsTextfieldExpression,
} from 'applets/fi-forest/utils'

const SERVER_URL = process.env.NEXT_PUBLIC_GEOSERVER_URL

const id: LayerGroupId = 'fi_forests'

const getStyle = async (): Promise<ExtendedMbStyle> => {
  const sources: any = {}
  let layers: any = []

  for (const layerGroupId in layerOptions) {
    const options = layerOptions[layerGroupId]
    sources[layerGroupId] = {
      type: 'vector',
      scheme: 'tms',
      tiles: [
        `${SERVER_URL}/gwc/service/tms/1.0.0/forest:${options.serverId}@EPSG:900913@pbf/{z}/{x}/{y}.pbf`,
      ],
      minzoom: options.minzoom,
      maxzoom: options.maxzoom,
      bounds: [19, 59, 32, 71], // Finland
      attribution:
        '<a href="https://www.metsaan.fi">© Finnish Forest Centre</a>',
      promoteId: 'id',
    }

    layers = [
      ...layers,
      {
        id: `${layerGroupId}-fill`,
        source: layerGroupId,
        'source-layer': options.serverId,
        type: 'fill',
        paint: {
          'fill-color': fiForestsAreaCO2FillColor(
            fiForestsCumulativeCO2eValueExpr
          ),
          'fill-opacity': layerGroupId === 'parcel' ? 1 : fillOpacity,
        },
        ...(options.layerMinzoom != null && { minzoom: options.layerMinzoom }),
        ...(options.layerMaxzoom != null && { maxzoom: options.layerMaxzoom }),
        selectable: true,
        multiSelectable: true,
        BEFORE: 'FILL',
      },
      {
        id: `${layerGroupId}-outline`,
        source: layerGroupId,
        'source-layer': options.serverId,
        type: 'line',
        paint: {
          'line-opacity': 0.5,
        },
        ...(options.layerMinzoom != null && { minzoom: options.layerMinzoom }),
        ...(options.layerMaxzoom != null && { maxzoom: options.layerMaxzoom }),
        BEFORE: 'OUTLINE',
      },
      {
        id: `${layerGroupId}-highlighted`,
        source: layerGroupId,
        'source-layer': options.serverId,
        type: 'fill',
        paint: {
          'fill-outline-color': '#484896',
          'fill-color': '#6e599f',
          'fill-opacity': 0.4,
        },
        filter: ['in', 'id', ''],
        BEFORE: 'OUTLINE',
        ...(options.layerMinzoom != null && { minzoom: options.layerMinzoom }),
        ...(options.layerMaxzoom != null && { maxzoom: options.layerMaxzoom }),
      },
      ...(layerGroupId === LayerLevel.Parcel
        ? [
            {
              id: `${layerGroupId}-symbol`,
              source: layerGroupId,
              'source-layer': options.serverId,
              type: 'symbol',
              paint: {},
              layout: {
                'text-size': 20,
                'symbol-placement': 'point',
                'text-font': ['Open Sans Regular'],
                'text-field': fiForestsTextfieldExpression(
                  fiForestsCumulativeCO2eValueExpr
                ),
              },
              ...(options.layerMinzoom != null && {
                minzoom: options.layerMinzoom,
              }),
              ...(options.layerMaxzoom != null && {
                maxzoom: options.layerMaxzoom,
              }),
            },
          ]
        : []),
    ]
  }

  return {
    version: 8,
    name: id,
    sources: sources,
    layers: layers,
  }
}

const layerConf: LayerConf = {
  id: id,
  style: getStyle,
  useMb: true,
}

export default layerConf
