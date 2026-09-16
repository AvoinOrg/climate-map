import type { ExtendedStyleSpecification } from '#/common/types/map'
import {
  ENERGYMAP_BUILDING_POLYGONS_SOURCE_MAX_ZOOM,
  ENERGYMAP_BUILDING_POLYGONS_SOURCE_MIN_ZOOM,
} from './buildingSource'
import {
  ENERGYMAP_ENERGY_CERTIFICATE_FILL_LAYER_ID,
  ENERGYMAP_ENERGY_CERTIFICATE_LAYER_IDS,
  ENERGYMAP_ENERGY_CERTIFICATE_OUTLINE_LAYER_ID,
} from './energyCertificateLayerConf'
import {
  ENERGYMAP_HEATING_FILL_LAYER_ID,
  ENERGYMAP_HEATING_LAYER_IDS,
  ENERGYMAP_HEATING_OUTLINE_LAYER_ID,
} from './heatingLayerConf'
import {
  ENERGYMAP_VENTILATION_FILL_LAYER_ID,
  ENERGYMAP_VENTILATION_LAYER_IDS,
  ENERGYMAP_VENTILATION_OUTLINE_LAYER_ID,
} from './ventilationLayerConf'
import energymapBuildingPolygonsLayerConf, {
  ENERGYMAP_BUILDING_COMPLETION_DATE_PROPERTY,
  ENERGYMAP_BUILDING_POLYGONS_FILL_LAYER_ID,
  ENERGYMAP_BUILDING_POLYGONS_LAYER_MAX_ZOOM,
  ENERGYMAP_BUILDING_POLYGONS_LAYER_IDS,
  ENERGYMAP_BUILDING_POLYGONS_LAYER_MIN_ZOOM,
  ENERGYMAP_BUILDING_POLYGONS_OUTLINE_LAYER_ID,
  ENERGYMAP_BUILDING_POLYGONS_SELECTED_FILL_LAYER_ID,
  ENERGYMAP_BUILDING_POLYGONS_SELECTED_OUTLINE_LAYER_ID,
  ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
  ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
  ENERGYMAP_BUILDING_KEY_PROPERTY,
  ENERGYMAP_BUILDING_MATCH_ALL_FILTER,
  ENERGYMAP_BUILDING_TYPE_CODES,
  ENERGYMAP_BUILDING_TYPE_FILTER_ALL,
  ENERGYMAP_BUILDING_TYPE_PROPERTY,
  ENERGYMAP_DEFAULT_SELECTED_CONSTRUCTION_DECADE,
  ENERGYMAP_SHARED_BUILDING_LAYER_IDS,
  combineMapFilters,
  getConstructionDecadeOptions,
  getEnergymapBuildingFilter,
} from './buildingPolygonsLayerConf'

const getSharedBuildingStyle =
  async (): Promise<ExtendedStyleSpecification> => {
    expect(typeof energymapBuildingPolygonsLayerConf.style).toBe('function')

    return await (
      energymapBuildingPolygonsLayerConf.style as () => Promise<ExtendedStyleSpecification>
    )()
  }

describe('Energiakartta building polygon filters', () => {
  it('uses documented building field names and RYTJ main purpose codes', () => {
    expect(ENERGYMAP_BUILDING_KEY_PROPERTY).toBe('building_key')
    expect(ENERGYMAP_BUILDING_TYPE_PROPERTY).toBe('main_purpose')
    expect(ENERGYMAP_BUILDING_COMPLETION_DATE_PROPERTY).toBe('completion_date')
    expect(ENERGYMAP_BUILDING_TYPE_CODES).toEqual([
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
    ])
  })

  it('creates decade bins including the Figma-selected 1970s decade', () => {
    expect(getConstructionDecadeOptions(2026)).toContainEqual({
      value: '1970',
      label: '1970 - 1979',
      startYear: 1970,
      endYear: 1979,
    })
    expect(getConstructionDecadeOptions(2026).at(-1)).toEqual({
      value: '2020',
      label: '2020 - 2029',
      startYear: 2020,
      endYear: 2029,
    })
  })

  it('returns the match-all building filter without active constraints', () => {
    expect(
      getEnergymapBuildingFilter({
        buildingTypeFilter: ENERGYMAP_BUILDING_TYPE_FILTER_ALL,
        selectedConstructionDecade:
          ENERGYMAP_DEFAULT_SELECTED_CONSTRUCTION_DECADE,
        showBuildingsFromSelectedDecade: false,
        showOnlySelectedDecade: false,
      })
    ).toEqual(ENERGYMAP_BUILDING_MATCH_ALL_FILTER)
  })

  it('does not apply a construction-year filter when no construction decade is selected', () => {
    expect(
      getEnergymapBuildingFilter({
        buildingTypeFilter: ENERGYMAP_BUILDING_TYPE_FILTER_ALL,
        selectedConstructionDecade:
          ENERGYMAP_DEFAULT_SELECTED_CONSTRUCTION_DECADE,
        showBuildingsFromSelectedDecade: true,
        showOnlySelectedDecade: true,
      })
    ).toEqual(ENERGYMAP_BUILDING_MATCH_ALL_FILTER)
  })

  it('filters a specific building type code', () => {
    expect(
      getEnergymapBuildingFilter({
        buildingTypeFilter: '06',
        selectedConstructionDecade:
          ENERGYMAP_DEFAULT_SELECTED_CONSTRUCTION_DECADE,
        showBuildingsFromSelectedDecade: false,
        showOnlySelectedDecade: false,
      })
    ).toEqual(['==', ['get', ENERGYMAP_BUILDING_TYPE_PROPERTY], '06'])
  })

  it('filters buildings from the selected decade onward', () => {
    expect(
      getEnergymapBuildingFilter({
        buildingTypeFilter: ENERGYMAP_BUILDING_TYPE_FILTER_ALL,
        selectedConstructionDecade: 1970,
        showBuildingsFromSelectedDecade: true,
        showOnlySelectedDecade: false,
      })
    ).toEqual([
      '>=',
      [
        'to-number',
        [
          'slice',
          ['to-string', ['get', ENERGYMAP_BUILDING_COMPLETION_DATE_PROPERTY]],
          0,
          4,
        ],
        -1,
      ],
      1970,
    ])
  })

  it('filters only buildings from the selected decade', () => {
    expect(
      getEnergymapBuildingFilter({
        buildingTypeFilter: ENERGYMAP_BUILDING_TYPE_FILTER_ALL,
        selectedConstructionDecade: 1970,
        showBuildingsFromSelectedDecade: false,
        showOnlySelectedDecade: true,
      })
    ).toEqual([
      'all',
      [
        '>=',
        [
          'to-number',
          [
            'slice',
            ['to-string', ['get', ENERGYMAP_BUILDING_COMPLETION_DATE_PROPERTY]],
            0,
            4,
          ],
          -1,
        ],
        1970,
      ],
      [
        '<',
        [
          'to-number',
          [
            'slice',
            ['to-string', ['get', ENERGYMAP_BUILDING_COMPLETION_DATE_PROPERTY]],
            0,
            4,
          ],
          -1,
        ],
        1980,
      ],
    ])
  })

  it('combines building and heating filters with an all expression', () => {
    expect(
      combineMapFilters([
        ['==', ['get', ENERGYMAP_BUILDING_TYPE_PROPERTY], '05'],
        ['==', ['get', 'heating_energy_source'], '01'],
      ])
    ).toEqual([
      'all',
      ['==', ['get', ENERGYMAP_BUILDING_TYPE_PROPERTY], '05'],
      ['==', ['get', 'heating_energy_source'], '01'],
    ])
  })
})

describe('Energiakartta shared building polygon layer config', () => {
  it('registers one vector source for all base and thematic building layers', async () => {
    const style = await getSharedBuildingStyle()
    const sourceIds = Object.keys(style.sources)
    const sharedSource = style.sources[
      ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID
    ] as { tiles?: string[] }

    expect(sourceIds).toEqual([ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID])
    expect(style.sources[ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID]).toMatchObject({
      type: 'vector',
      scheme: 'tms',
      minzoom: ENERGYMAP_BUILDING_POLYGONS_SOURCE_MIN_ZOOM,
      maxzoom: ENERGYMAP_BUILDING_POLYGONS_SOURCE_MAX_ZOOM,
      bounds: [19, 59, 32, 71],
      promoteId: ENERGYMAP_BUILDING_KEY_PROPERTY,
    })
    expect(sharedSource.tiles?.[0]).toContain(
      'sandbox_energiakartta:energymap_building_polygons@EPSG:900913@pbf'
    )
  })

  it('puts base, selected-highlight, and all thematic layers on the shared source-layer', async () => {
    const style = await getSharedBuildingStyle()
    const layerIds = style.layers.map((layer) => layer.id)

    expect(layerIds).toEqual(
      expect.arrayContaining(ENERGYMAP_BUILDING_POLYGONS_LAYER_IDS)
    )
    expect(layerIds).toEqual(
      expect.arrayContaining(ENERGYMAP_ENERGY_CERTIFICATE_LAYER_IDS)
    )
    expect(layerIds).toEqual(expect.arrayContaining(ENERGYMAP_HEATING_LAYER_IDS))
    expect(layerIds).toEqual(
      expect.arrayContaining(ENERGYMAP_VENTILATION_LAYER_IDS)
    )
    expect(ENERGYMAP_SHARED_BUILDING_LAYER_IDS).toEqual([
      ...ENERGYMAP_BUILDING_POLYGONS_LAYER_IDS,
      ...ENERGYMAP_ENERGY_CERTIFICATE_LAYER_IDS,
      ...ENERGYMAP_HEATING_LAYER_IDS,
      ...ENERGYMAP_VENTILATION_LAYER_IDS,
    ])

    for (const layerId of ENERGYMAP_SHARED_BUILDING_LAYER_IDS) {
      const layer = style.layers.find((candidate) => candidate.id === layerId)

      expect(layer).toMatchObject({
        source: ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
        'source-layer': ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
      })
    }
  })

  it('gates every shared building rendering layer to the published polygon zoom range', async () => {
    const style = await getSharedBuildingStyle()

    for (const layerId of ENERGYMAP_SHARED_BUILDING_LAYER_IDS) {
      const layer = style.layers.find((candidate) => candidate.id === layerId)

      expect(layer).toMatchObject({
        minzoom: ENERGYMAP_BUILDING_POLYGONS_LAYER_MIN_ZOOM,
        maxzoom: ENERGYMAP_BUILDING_POLYGONS_LAYER_MAX_ZOOM,
      })
    }
  })

  it('keeps the base building layer filtered on match-all and thematic layers initially transparent', async () => {
    const style = await getSharedBuildingStyle()
    const baseFill = style.layers.find(
      (layer) => layer.id === ENERGYMAP_BUILDING_POLYGONS_FILL_LAYER_ID
    ) as any
    const baseOutline = style.layers.find(
      (layer) => layer.id === ENERGYMAP_BUILDING_POLYGONS_OUTLINE_LAYER_ID
    ) as any
    const energyFill = style.layers.find(
      (layer) => layer.id === ENERGYMAP_ENERGY_CERTIFICATE_FILL_LAYER_ID
    ) as any
    const energyOutline = style.layers.find(
      (layer) => layer.id === ENERGYMAP_ENERGY_CERTIFICATE_OUTLINE_LAYER_ID
    ) as any
    const heatingFill = style.layers.find(
      (layer) => layer.id === ENERGYMAP_HEATING_FILL_LAYER_ID
    ) as any
    const heatingOutline = style.layers.find(
      (layer) => layer.id === ENERGYMAP_HEATING_OUTLINE_LAYER_ID
    ) as any
    const ventilationFill = style.layers.find(
      (layer) => layer.id === ENERGYMAP_VENTILATION_FILL_LAYER_ID
    ) as {
      layout?: { visibility?: string }
      paint?: Record<string, unknown>
    }
    const ventilationOutline = style.layers.find(
      (layer) => layer.id === ENERGYMAP_VENTILATION_OUTLINE_LAYER_ID
    ) as {
      layout?: { visibility?: string }
      paint?: Record<string, unknown>
    }

    expect(baseFill?.filter).toEqual(ENERGYMAP_BUILDING_MATCH_ALL_FILTER)
    expect(baseOutline?.filter).toEqual(ENERGYMAP_BUILDING_MATCH_ALL_FILTER)
    expect(energyFill?.paint?.['fill-opacity']).toBe(0)
    expect(energyOutline?.paint?.['line-opacity']).toBe(0)
    expect(heatingFill?.paint?.['fill-opacity']).toBe(0)
    expect(heatingOutline?.paint?.['line-opacity']).toBe(0)
    expect(ventilationFill?.paint?.['fill-opacity']).toBe(0)
    expect(ventilationOutline?.paint?.['line-opacity']).toBe(0)
    expect(ventilationFill?.layout?.visibility).toBe('none')
    expect(ventilationOutline?.layout?.visibility).toBe('none')
  })

  it('opts the base fill into selection and pointer hover', async () => {
    const style = await getSharedBuildingStyle()
    const baseFill = style.layers.find(
      (layer) => layer.id === ENERGYMAP_BUILDING_POLYGONS_FILL_LAYER_ID
    ) as any

    expect(baseFill?.selectable).toBe(true)
    expect(baseFill?.hoverPointer).toBe(true)
  })

  it('keeps selected-highlight layer ids compatible with map layer-name parsing', () => {
    expect(
      ENERGYMAP_BUILDING_POLYGONS_SELECTED_FILL_LAYER_ID.split('-')
    ).toHaveLength(2)
    expect(
      ENERGYMAP_BUILDING_POLYGONS_SELECTED_OUTLINE_LAYER_ID.split('-')
    ).toHaveLength(2)
  })

  it('renders selected-building highlight layers above thematic building layers', async () => {
    const style = await getSharedBuildingStyle()
    const layerIds = style.layers.map((layer) => layer.id)
    const selectedFill = style.layers.find(
      (layer) => layer.id === ENERGYMAP_BUILDING_POLYGONS_SELECTED_FILL_LAYER_ID
    ) as any
    const selectedOutline = style.layers.find(
      (layer) =>
        layer.id === ENERGYMAP_BUILDING_POLYGONS_SELECTED_OUTLINE_LAYER_ID
    ) as any
    const lastThematicLayerIndex = Math.max(
      ...[
        ...ENERGYMAP_ENERGY_CERTIFICATE_LAYER_IDS,
        ...ENERGYMAP_HEATING_LAYER_IDS,
        ...ENERGYMAP_VENTILATION_LAYER_IDS,
      ].map((layerId) => layerIds.indexOf(layerId))
    )

    expect(layerIds.indexOf(ENERGYMAP_BUILDING_POLYGONS_SELECTED_FILL_LAYER_ID))
      .toBeGreaterThan(lastThematicLayerIndex)
    expect(
      layerIds.indexOf(ENERGYMAP_BUILDING_POLYGONS_SELECTED_OUTLINE_LAYER_ID)
    ).toBeGreaterThan(
      layerIds.indexOf(ENERGYMAP_BUILDING_POLYGONS_SELECTED_FILL_LAYER_ID)
    )
    expect(selectedFill).toMatchObject({
      source: ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
      'source-layer': ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
      type: 'fill',
      filter: ENERGYMAP_BUILDING_MATCH_ALL_FILTER,
      paint: {
        'fill-color': '#FFFFFF',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          0.18,
          0,
        ],
      },
    })
    expect(selectedOutline).toMatchObject({
      source: ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
      'source-layer': ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
      type: 'line',
      filter: ENERGYMAP_BUILDING_MATCH_ALL_FILTER,
      paint: {
        'line-color': '#111111',
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          1,
          0,
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'selected'], false],
          3.25,
          0,
        ],
      },
    })
  })
})
