import * as ventilationLayerConfModule from './ventilationLayerConf'
import {
  ENERGYMAP_VENTILATION_CATEGORY_PROPERTY,
  ENERGYMAP_VENTILATION_CATEGORY_VALUES,
} from '../common/ventilation'
import {
  ENERGYMAP_BUILDING_POLYGONS_LAYER_MAX_ZOOM,
  ENERGYMAP_BUILDING_POLYGONS_LAYER_MIN_ZOOM,
  ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
  ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
} from './buildingPolygonsLayerConf'
import {
  ENERGYMAP_VENTILATION_COLOR_EXPRESSION,
  ENERGYMAP_VENTILATION_FILL_LAYER_ID,
  ENERGYMAP_VENTILATION_LAYER_IDS,
  ENERGYMAP_VENTILATION_OUTLINE_LAYER_ID,
  ENERGYMAP_VENTILATION_UNMATCHED_COLOR,
  VENTILATION_CATEGORY_COLORS,
  createEnergymapVentilationLayers,
  getVentilationCategoryFilter,
} from './ventilationLayerConf'

const evaluateVentilationColor = (value: unknown) => {
  const expression = ENERGYMAP_VENTILATION_COLOR_EXPRESSION as unknown[]

  for (let index = 2; index < expression.length - 1; index += 2) {
    if (expression[index] === value) {
      return expression[index + 1]
    }
  }

  return expression.at(-1)
}

describe('Energiakartta ventilation category filter', () => {
  it('keeps all-on as an explicit valid-category allowlist', () => {
    expect(
      getVentilationCategoryFilter(ENERGYMAP_VENTILATION_CATEGORY_VALUES)
    ).toEqual([
      'in',
      ['get', ENERGYMAP_VENTILATION_CATEGORY_PROPERTY],
      ['literal', ENERGYMAP_VENTILATION_CATEGORY_VALUES],
    ])
  })

  it('allows only the selected exact categories', () => {
    expect(getVentilationCategoryFilter(['gravity', 'other'])).toEqual([
      'in',
      ['get', ENERGYMAP_VENTILATION_CATEGORY_PROPERTY],
      ['literal', ['gravity', 'other']],
    ])
    expect(getVentilationCategoryFilter(['no_info'])).toEqual([
      'in',
      ['get', ENERGYMAP_VENTILATION_CATEGORY_PROPERTY],
      ['literal', ['no_info']],
    ])
  })

  it('uses an impossible sentinel when no category is selected', () => {
    expect(getVentilationCategoryFilter([])).toEqual([
      '==',
      ['get', ENERGYMAP_VENTILATION_CATEGORY_PROPERTY],
      '__avoin_no_matching_ventilation_category__',
    ])
  })
})

describe('Energiakartta ventilation color expression', () => {
  it('uses the two Figma fills and distinct other/no-info extensions', () => {
    expect(VENTILATION_CATEGORY_COLORS).toEqual({
      mechanical: '#06A4C0',
      gravity: '#326CB1',
      other: '#C77924',
      no_info: '#7A7F87',
    })
    expect(new Set(Object.values(VENTILATION_CATEGORY_COLORS)).size).toBe(4)
  })

  it.each(ENERGYMAP_VENTILATION_CATEGORY_VALUES)(
    'maps %s to its declared category color',
    (category) => {
      expect(evaluateVentilationColor(category)).toBe(
        VENTILATION_CATEGORY_COLORS[category]
      )
    }
  )

  it.each([undefined, null, '', 'stale', 'mechanical_ventilation', 1])(
    'fails closed for unmatched value %p',
    (value) => {
      const color = evaluateVentilationColor(value)

      expect(color).toBe(ENERGYMAP_VENTILATION_UNMATCHED_COLOR)
      expect(color).not.toBe(VENTILATION_CATEGORY_COLORS.mechanical)
      expect(color).not.toBe(VENTILATION_CATEGORY_COLORS.other)
      expect(color).not.toBe(VENTILATION_CATEGORY_COLORS.no_info)
    }
  )
})

describe('Energiakartta ventilation shared layers', () => {
  it('exports shared-layer helpers rather than an independent layer config', () => {
    expect('default' in ventilationLayerConfModule).toBe(false)
  })

  it('creates a hidden and fail-closed pair on the caller-provided source', () => {
    const layers = createEnergymapVentilationLayers({
      sourceId: ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
      sourceLayer: ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
    })
    const expectedFilter = getVentilationCategoryFilter(
      ENERGYMAP_VENTILATION_CATEGORY_VALUES
    )

    expect(layers.map(({ id }) => id)).toEqual(ENERGYMAP_VENTILATION_LAYER_IDS)

    for (const layer of layers) {
      expect(layer).toMatchObject({
        source: ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
        'source-layer': ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
        minzoom: ENERGYMAP_BUILDING_POLYGONS_LAYER_MIN_ZOOM,
        maxzoom: ENERGYMAP_BUILDING_POLYGONS_LAYER_MAX_ZOOM,
        filter: expectedFilter,
        layout: { visibility: 'none' },
      })
      expect(layer).not.toHaveProperty('selectable')
      expect(layer).not.toHaveProperty('hoverPointer')
    }

    const fill = layers.find(
      ({ id }) => id === ENERGYMAP_VENTILATION_FILL_LAYER_ID
    ) as { paint: Record<string, unknown> }
    const outline = layers.find(
      ({ id }) => id === ENERGYMAP_VENTILATION_OUTLINE_LAYER_ID
    ) as { paint: Record<string, unknown> }

    expect(fill.paint['fill-color']).toEqual(
      ENERGYMAP_VENTILATION_COLOR_EXPRESSION
    )
    expect(fill.paint['fill-opacity']).toBe(0)
    expect(outline.paint['line-color']).toEqual(
      ENERGYMAP_VENTILATION_COLOR_EXPRESSION
    )
    expect(outline.paint['line-opacity']).toBe(0)
  })
})
