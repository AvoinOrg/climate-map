import { map, uniq } from 'lodash-es'

import { getColorExpressionArrForValues } from '#/common/utils/map'
import { ExtendedMbStyle, SerializableLayerConf } from '#/common/types/map'
import GeoJSON from 'geojson'
import {
  CalcFeatureCollection,
  CalcFeatureProperties,
  featureCols,
  CalcFeature,
  CalcFeatureYearValues,
  FeatureCalcs,
  featureYears,
} from './types'

export const getPlanLayerGroupId = (planId: string) => {
  return `${planId}_zoning_plan`
}

export const createLayerConf = (
  json: any,
  planId: string,
  featureColorCol: string
) => {
  const uniqueVals = uniq(map(json.features, 'properties.' + featureColorCol))
  const colorArr = getColorExpressionArrForValues(uniqueVals)

  const sourceId = getPlanLayerGroupId(planId)

  const style: ExtendedMbStyle = {
    version: 8,
    sources: {
      [sourceId]: {
        type: 'geojson',
        // Use a URL for the value for the `data` property.
        data: json,
        promoteId: 'id',
      },
    },
    layers: [
      {
        id: `${sourceId}-outline`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-opacity': 0.9,
        },
        // selectable: true,
        // multiSelectable: true,
        // highlightLayerId: `${sourceId}-outline-highlighted`,
        // filter: ['!=', 'id', ''],
      },
      {
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId, // reference the data source
        layout: {},
        paint: {
          'fill-color': 'gray',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            1,
            0.5,
          ],
        },
        selectable: true,
        multiSelectable: true,
      },
      {
        id: `${sourceId}-symbol`,
        source: sourceId,
        type: 'symbol',
        layout: {
          'symbol-placement': 'point',
          'text-size': 20,
          'text-font': ['Open Sans Regular'],
          'text-field': [
            'case',
            ['has', featureColorCol],
            ['get', featureColorCol],
            '',
          ],
        },
        paint: {
          'text-color': '#999',
          'text-halo-blur': 1,
          'text-halo-color': 'rgb(242,243,240)',
          'text-halo-width': 2,
        },
        minzoom: 12,
      },
    ],
  }

  const layerConf: SerializableLayerConf = {
    id: sourceId,
    style: style,
    useMb: true,
  }

  return layerConf
}

export const transformCalcGeojsonToNestedStructure = (
  input: GeoJSON.FeatureCollection
): CalcFeatureCollection => {
  const output: CalcFeatureCollection = {
    type: 'FeatureCollection',
    features: [],
  }

  input.features.forEach((feature: any) => {
    const newProperties: CalcFeatureProperties = {} as CalcFeatureProperties

    featureCols.forEach((col) => {
      newProperties[col] = {
        nochange: {
          now: feature.properties[`${col}_nochange_now`],
          '2035': feature.properties[`${col}_nochange_2035`],
          '2045': feature.properties[`${col}_nochange_2045`],
          '2055': feature.properties[`${col}_nochange_2055`],
        },
        planned: {
          now: feature.properties[`${col}_planned_now`],
          '2035': feature.properties[`${col}_planned_2035`],
          '2045': feature.properties[`${col}_planned_2045`],
          '2055': feature.properties[`${col}_planned_2055`],
        },
      }
    })

    newProperties.area = feature.properties.area
    newProperties.zoning_code = feature.properties.zoning_code

    const newFeature: CalcFeature = {
      id: feature.id,
      type: 'Feature',
      properties: newProperties,
      geometry: feature.geometry,
    }

    output.features.push(newFeature)
  })

  return output
}

export const getAggregatedCalcs = (calcFeature: CalcFeature): FeatureCalcs => {
  const calculations: Partial<FeatureCalcs> = {} // Start as a partial for intermediate computations

  featureCols.forEach((col) => {
    const nochange = calcFeature.properties[col].nochange
    const planned = calcFeature.properties[col].planned
    const yearDiffs: Partial<CalcFeatureYearValues> = {}

    // Dynamically compute differences for each year
    featureYears.forEach((year) => {
      if (nochange[year] !== undefined && planned[year] !== undefined) {
        yearDiffs[year] = planned[year] - nochange[year]
      }
    })

    calculations[`${col}_diff`] = yearDiffs as CalcFeatureYearValues
  })

  return calculations as FeatureCalcs // Cast back to FeatureCalcs after computing all the values
}
