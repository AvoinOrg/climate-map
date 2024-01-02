import { map, uniq } from 'lodash-es'
import { Expression } from 'mapbox-gl'
import GeoJSON from 'geojson'

import { ExtendedMbStyle, SerializableLayerConf } from '#/common/types/map'
import {
  CalcFeatureCollection,
  CalcFeatureProperties,
  featureCols,
  CalcFeature,
  CalcFeatureYearValues,
  FeatureCalcs,
  GraphCalcType,
} from './types'
import {
  ZONING_CLASSES,
  CARBON_CHANGE_COLORS,
  CARBON_CHANGE_NO_DATA_COLOR,
} from './constants'

export const getPlanLayerGroupId = (planId: string) => {
  return `${planId}_zoning_plan`
}

const zoningFillColorExpression = (defaultColor = 'white'): Expression => {
  const expression: Expression = ['match', ['get', 'zoning_code']]

  ZONING_CLASSES.forEach((zoningClass) => {
    expression.push(zoningClass.code, zoningClass.color_hex)
  })

  // Default color if no match is found
  expression.push(defaultColor)

  return expression
}

export const isZoningClassValidExpression = () => {
  // This array will hold the zoning codes to check
  let validZoningCodes: string[] = []

  // Populate the array with valid zoning codes
  ZONING_CLASSES.forEach((zoningClass) => {
    validZoningCodes.push(zoningClass.code)
  })

  // Return a Mapbox expression that checks if the zoning code is in the list of valid codes
  // The expression uses the 'in' operator to check if the zoning code is in the array of valid codes
  return [
    'in',
    ['get', 'zoning_code'],
    ['literal', validZoningCodes],
  ] as Expression
}

export const createLayerConf = (
  json: any,
  planId: string,
  featureColorCol: string
) => {
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
          'line-color': 'black',
          'line-opacity': 1,
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            3,
            1.5,
          ],
          'line-dasharray': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            [
              'case',
              isZoningClassValidExpression(),
              ['literal', [1, 0]],
              ['literal', [1, 1]],
            ],
            [
              'case',
              isZoningClassValidExpression(),
              ['literal', [1, 0]],
              ['literal', [3, 3]],
            ],
          ],
        },
      },
      {
        id: `${sourceId}-fill`,
        type: 'fill',
        source: sourceId, // reference the data source
        layout: {},
        paint: {
          'fill-color': zoningFillColorExpression(),
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false], // Check if the feature is selected
            [
              'case',
              isZoningClassValidExpression(),
              0.9, // Opacity for selected and valid zoning class
              0.9, // Opacity for selected but not valid zoning class
            ],
            ['case', isZoningClassValidExpression(), 0.6, 0.5],
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
            isZoningClassValidExpression(),
            ['get', featureColorCol],
            '!',
          ],
        },
        paint: {
          'text-color': 'black',
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
      const nochange = Object.keys(feature.properties).reduce(
        (obj: any, key) => {
          if (key.startsWith(`${col}_nochange_`)) {
            const year = key.split(`${col}_nochange_`)[1]
            obj[year] = feature.properties[key]
          }
          return obj
        },
        {}
      )

      const planned = Object.keys(feature.properties).reduce(
        (obj: any, key) => {
          if (key.startsWith(`${col}_planned_`)) {
            const year = key.split(`${col}_planned_`)[1]
            obj[year] = feature.properties[key]
          }
          return obj
        },
        {}
      )

      newProperties[col] = {
        nochange,
        planned,
      }
      newProperties
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

export const getAggregatedCalcs = (
  calcFeature: CalcFeature,
  featureYears: string[]
): FeatureCalcs => {
  const calculations: Partial<FeatureCalcs> = {} // Start as a partial for intermediate computations

  featureCols.forEach((col) => {
    const nochange = calcFeature.properties[col].nochange
    const planned = calcFeature.properties[col].planned
    const yearDiffs: Partial<CalcFeatureYearValues> = {}

    // Dynamically compute differences for each year
    featureYears.forEach((year: string) => {
      if (nochange[year] !== undefined && planned[year] !== undefined) {
        yearDiffs[year] = planned[year] - nochange[year]
      }
    })

    calculations[`${col}_diff`] = yearDiffs as CalcFeatureYearValues
  })

  return calculations as FeatureCalcs // Cast back to FeatureCalcs after computing all the values
}

const getColorForBioOrGroundCarbon = (
  bioOrGround: 'bio' | 'ground',
  properties: CalcFeatureProperties,
  year: string,
  usePlanned: boolean = true
) => {
  const propName = bioOrGround === 'bio' ? 'bio_carbon_ha' : 'ground_carbon_ha'

  if (
    properties[propName].nochange?.[year] == undefined ||
    properties[propName].nochange?.[year] < 0
  ) {
    return CARBON_CHANGE_NO_DATA_COLOR
  }

  const firstYear = Math.min(
    ...Object.keys(properties.bio_carbon_ha.nochange).map((year) =>
      Number(year)
    )
  )

  let carbon = properties[propName].nochange?.[firstYear]

  if (usePlanned) {
    if (
      properties[propName].planned?.[year] == undefined ||
      properties[propName].planned?.[year] < 0
    ) {
      return CARBON_CHANGE_NO_DATA_COLOR
    }

    const carbonPlanned = properties[propName].planned?.[year]

    carbon = carbonPlanned - carbon
  }

  return determineCarbonChangeColor(carbon)
}

const getColorForTotalCarbon = (
  properties: CalcFeatureProperties,
  year: string,
  usePlanned: boolean = true
) => {
  if (
    properties.bio_carbon_ha?.nochange?.[year] == undefined ||
    properties.ground_carbon_ha?.nochange?.[year] == undefined ||
    properties.bio_carbon_ha?.nochange?.[year] < 0 ||
    properties.ground_carbon_ha?.nochange?.[year] < 0
  ) {
    return CARBON_CHANGE_NO_DATA_COLOR
  }

  const firstYear = Math.min(
    ...Object.keys(properties.bio_carbon_ha.nochange).map((year) =>
      Number(year)
    )
  )

  let bioCarbon = properties.bio_carbon_ha?.nochange?.[firstYear]
  let groundCarbon = properties.ground_carbon_ha?.nochange?.[firstYear]

  if (usePlanned) {
    if (
      properties.bio_carbon_ha?.planned?.[year] == undefined ||
      properties.ground_carbon_ha?.planned?.[year] == undefined ||
      properties.bio_carbon_ha?.planned?.[year] < 0 ||
      properties.ground_carbon_ha?.planned?.[year] < 0
    ) {
      return CARBON_CHANGE_NO_DATA_COLOR
    }

    const bioCarbonPlanned = properties.bio_carbon_ha?.planned?.[year]
    const groundCarbonPlanned = properties.ground_carbon_ha?.planned?.[year]

    bioCarbon = bioCarbonPlanned - bioCarbon
    groundCarbon = groundCarbonPlanned - groundCarbon
  }

  const totalCarbon = bioCarbon + groundCarbon

  return determineCarbonChangeColor(totalCarbon)
}

export const getCarbonChangeColorForProperties = (
  properties: CalcFeatureProperties,
  year: string,
  calcType: GraphCalcType = 'total',
  usePlanned: boolean = true
) => {
  switch (calcType) {
    case 'bio':
      return getColorForBioOrGroundCarbon('bio', properties, year, usePlanned)
    case 'ground':
      return getColorForBioOrGroundCarbon(
        'ground',
        properties,
        year,
        usePlanned
      )
    case 'total':
    default:
      return getColorForTotalCarbon(properties, year, usePlanned)
  }
}

const determineCarbonChangeColor = (carbon: Number) => {
  let color = ''

  for (let i = 0; i < CARBON_CHANGE_COLORS.length; i++) {
    if (i === 0) {
      if (carbon < CARBON_CHANGE_COLORS[i].min) {
        color = CARBON_CHANGE_COLORS[i].color
        break
      }
    }

    if (i === CARBON_CHANGE_COLORS.length - 1) {
      if (carbon >= CARBON_CHANGE_COLORS[i].min) {
        color = CARBON_CHANGE_COLORS[i].color
        break
      }
    }

    if (
      carbon >= CARBON_CHANGE_COLORS[i].min &&
      carbon < CARBON_CHANGE_COLORS[i + 1].min
    ) {
      color = CARBON_CHANGE_COLORS[i].color
      break
    }
  }

  return color || CARBON_CHANGE_NO_DATA_COLOR
}
