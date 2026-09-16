import type { ExpressionSpecification, FilterSpecification } from 'maplibre-gl'

import type { ExtendedLayerSpecification } from '#/common/types/map'
import {
  ENERGYMAP_VENTILATION_CATEGORY_PROPERTY,
  ENERGYMAP_VENTILATION_CATEGORY_VALUES,
  type EnergymapVentilationCategory,
} from '../common/ventilation'
import {
  ENERGYMAP_BUILDING_POLYGONS_LAYER_MAX_ZOOM,
  ENERGYMAP_BUILDING_POLYGONS_LAYER_MIN_ZOOM,
} from './buildingSource'

export const ENERGYMAP_VENTILATION_LAYER_GROUP_ID = 'energymap_ventilation'
export const ENERGYMAP_VENTILATION_FILL_LAYER_ID = `${ENERGYMAP_VENTILATION_LAYER_GROUP_ID}-fill`
export const ENERGYMAP_VENTILATION_OUTLINE_LAYER_ID = `${ENERGYMAP_VENTILATION_LAYER_GROUP_ID}-outline`
export const ENERGYMAP_VENTILATION_LAYER_IDS = [
  ENERGYMAP_VENTILATION_FILL_LAYER_ID,
  ENERGYMAP_VENTILATION_OUTLINE_LAYER_ID,
] as const

export const ENERGYMAP_VENTILATION_FILL_OPACITY = 0.62
export const ENERGYMAP_VENTILATION_OUTLINE_OPACITY = 0.45

const VENTILATION_CATEGORY_COLOR_VALUES = [
  '#0072B2',
  '#D55E00',
  '#CC79A7',
  '#8E8E8E',
] as const

export const VENTILATION_CATEGORY_COLORS = Object.fromEntries(
  ENERGYMAP_VENTILATION_CATEGORY_VALUES.map((category, index) => [
    category,
    VENTILATION_CATEGORY_COLOR_VALUES[index],
  ])
) as Record<EnergymapVentilationCategory, string>

export const ENERGYMAP_VENTILATION_UNMATCHED_COLOR = 'rgba(0, 0, 0, 0)'

const VENTILATION_CATEGORY_COLOR_STOPS =
  ENERGYMAP_VENTILATION_CATEGORY_VALUES.flatMap((category) => [
    category,
    VENTILATION_CATEGORY_COLORS[category],
  ])

export const ENERGYMAP_VENTILATION_COLOR_EXPRESSION = [
  'match',
  ['get', ENERGYMAP_VENTILATION_CATEGORY_PROPERTY],
  ...VENTILATION_CATEGORY_COLOR_STOPS,
  ENERGYMAP_VENTILATION_UNMATCHED_COLOR,
] as unknown as ExpressionSpecification

const NO_MATCH_VENTILATION_CATEGORY =
  '__avoin_no_matching_ventilation_category__'

export const getVentilationCategoryFilter = (
  activeCategories: readonly EnergymapVentilationCategory[]
): FilterSpecification => {
  if (activeCategories.length === 0) {
    return [
      '==',
      ['get', ENERGYMAP_VENTILATION_CATEGORY_PROPERTY],
      NO_MATCH_VENTILATION_CATEGORY,
    ] as FilterSpecification
  }

  return [
    'in',
    ['get', ENERGYMAP_VENTILATION_CATEGORY_PROPERTY],
    ['literal', activeCategories],
  ] as FilterSpecification
}

export const createEnergymapVentilationLayers = ({
  sourceId,
  sourceLayer,
}: {
  sourceId: string
  sourceLayer: string
}): ExtendedLayerSpecification[] => {
  const validCategoryFilter = getVentilationCategoryFilter(
    ENERGYMAP_VENTILATION_CATEGORY_VALUES
  )

  return [
    {
      id: ENERGYMAP_VENTILATION_FILL_LAYER_ID,
      source: sourceId,
      'source-layer': sourceLayer,
      type: 'fill',
      minzoom: ENERGYMAP_BUILDING_POLYGONS_LAYER_MIN_ZOOM,
      maxzoom: ENERGYMAP_BUILDING_POLYGONS_LAYER_MAX_ZOOM,
      filter: validCategoryFilter,
      layout: {
        visibility: 'none',
      },
      paint: {
        'fill-color': ENERGYMAP_VENTILATION_COLOR_EXPRESSION,
        'fill-opacity': 0,
      },
    },
    {
      id: ENERGYMAP_VENTILATION_OUTLINE_LAYER_ID,
      source: sourceId,
      'source-layer': sourceLayer,
      type: 'line',
      minzoom: ENERGYMAP_BUILDING_POLYGONS_LAYER_MIN_ZOOM,
      maxzoom: ENERGYMAP_BUILDING_POLYGONS_LAYER_MAX_ZOOM,
      filter: validCategoryFilter,
      layout: {
        visibility: 'none',
      },
      paint: {
        'line-color': ENERGYMAP_VENTILATION_COLOR_EXPRESSION,
        'line-opacity': 0,
        'line-width': 0.75,
      },
    },
  ]
}
