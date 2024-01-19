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
  ReportData,
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

export const isZoningCodeValid = (zoningCode: string) => {
  return ZONING_CLASSES.some(
    (zoningClassObj) => zoningClassObj.code === zoningCode
  )
}

export const isZoningCodeValidExpression = () => {
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
              isZoningCodeValidExpression(),
              ['literal', [1, 0]],
              ['literal', [1, 1]],
            ],
            [
              'case',
              isZoningCodeValidExpression(),
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
              isZoningCodeValidExpression(),
              0.9, // Opacity for selected and valid zoning class
              0.9, // Opacity for selected but not valid zoning class
            ],
            ['case', isZoningCodeValidExpression(), 0.6, 0.5],
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
            isZoningCodeValidExpression(),
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

const getValueForBioOrGroundCarbon = (
  bioOrGround: 'bio' | 'ground',
  properties: CalcFeatureProperties,
  year: string,
  useHa: boolean = true,
  usePlanned: boolean = true
): number | undefined => {
  let propName: keyof CalcFeatureProperties

  if (bioOrGround === 'bio') {
    propName = useHa ? 'bio_carbon_ha' : 'bio_carbon_total'
  } else {
    propName = useHa ? 'ground_carbon_ha' : 'ground_carbon_total'
  }

  if (
    properties[propName].nochange?.[year] == undefined ||
    properties[propName].nochange?.[year] < 0
  ) {
    return undefined
  }

  const firstYear = Math.min(
    ...Object.keys(properties.bio_carbon_ha.nochange).map((year) =>
      Number(year)
    )
  )

  let carbon = properties[propName].nochange?.[firstYear]

  let col: 'nochange' | 'planned' = 'nochange'
  if (usePlanned) {
    col = 'planned'
  }

  if (
    properties[propName][col]?.[year] == undefined ||
    properties[propName][col]?.[year] < 0
  ) {
    return undefined
  }

  const carbonPlanned = properties[propName][col]?.[year]

  carbon = carbonPlanned - carbon

  return carbon
}

const getValueForTotalCarbon = (
  properties: CalcFeatureProperties,
  year: string,
  useHa: boolean = true,
  usePlanned: boolean = true
): number | undefined => {
  const bioPropName = useHa ? 'bio_carbon_ha' : 'bio_carbon_total'
  const groundPropName = useHa ? 'ground_carbon_ha' : 'ground_carbon_total'

  if (
    properties[bioPropName].nochange?.[year] == undefined ||
    properties[groundPropName].nochange?.[year] == undefined ||
    properties[bioPropName].nochange?.[year] < 0 ||
    properties[groundPropName].nochange?.[year] < 0
  ) {
    return undefined
  }

  const firstYear = Math.min(
    ...Object.keys(properties.bio_carbon_ha.nochange).map((year) =>
      Number(year)
    )
  )

  let bioCarbon = properties[bioPropName].nochange?.[firstYear]
  let groundCarbon = properties[groundPropName].nochange?.[firstYear]

  let col: 'nochange' | 'planned' = 'nochange'
  if (usePlanned) {
    col = 'planned'
  }

  if (
    properties[bioPropName][col]?.[year] == undefined ||
    properties[groundPropName][col]?.[year] == undefined ||
    properties[bioPropName][col]?.[year] < 0 ||
    properties[groundPropName][col]?.[year] < 0
  ) {
    return undefined
  }

  const bioCarbonPlanned = properties[bioPropName][col]?.[year]
  const groundCarbonPlanned = properties[groundPropName][col]?.[year]

  bioCarbon = bioCarbonPlanned - bioCarbon
  groundCarbon = groundCarbonPlanned - groundCarbon

  const totalCarbon = bioCarbon + groundCarbon

  return totalCarbon
}

export const getCarbonValueForProperties = (
  properties: CalcFeatureProperties,
  year: string,
  calcType: GraphCalcType = 'total',
  useHa: boolean = false,
  usePlanned: boolean = true
) => {
  switch (calcType) {
    case 'bio':
      return getValueForBioOrGroundCarbon(
        'bio',
        properties,
        year,
        useHa,
        usePlanned
      )
    case 'ground':
      return getValueForBioOrGroundCarbon(
        'ground',
        properties,
        year,
        useHa,
        usePlanned
      )
    case 'total':
    default:
      return getValueForTotalCarbon(properties, year, useHa, usePlanned)
  }
}

export const getCarbonChangeColor = (carbon: Number | null | undefined) => {
  let color = CARBON_CHANGE_NO_DATA_COLOR
  if (carbon == null) {
    return color
  }

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

export const processCalcQueryToReportData = (data: any): ReportData => {
  const areas = transformCalcGeojsonToNestedStructure(data.areas)
  const totals = transformCalcGeojsonToNestedStructure(data.totals)

  const featureYears = Object.keys(
    totals.features[0].properties[featureCols[0]].nochange
  )
  const metadata = {
    timestamp: Number(data.metadata.calculated_ts),
    reportName: data.metadata.report_name,
    featureYears,
  }

  const totalsAgg = getAggregatedCalcs(totals.features[0], featureYears)

  const agg = { totals: totalsAgg }

  const reportData = {
    areas: areas,
    totals: totals,
    metadata: metadata,
    agg: agg,
  }

  return reportData
}

export const checkIsValidZoningCode = (zoningCode: string | null) => {
  if (zoningCode == null) {
    return false
  }

  for (let zoning of ZONING_CLASSES) {
    // Split the code by comma and trim spaces, then check if zoningCode is one of them
    const codes = zoning.code.split(',').map((code) => code.trim())
    if (codes.includes(zoningCode.trim())) {
      return true
    }
  }
  return false
}
