import { mockAreaMap } from '../../../../../utils/test/energyAreas/mapMock'
import type { MapGeoJSONFeature } from 'maplibre-gl'
import { useMapStore } from '#/common/store/mapStore'
import { useMapInstanceStore } from '#/common/store/mapStore/mapInstanceStore'
import { useAppletStore } from 'applets/energy/state/appletStore'
import {
  EnergyAreaMapRuntime,
  type CommittedAreaGeneration,
} from './mapRuntime'
import { projectAreaSelection } from './selection'
import { areaLayerIds } from 'applets/energy/layers/areaLayers'
import { ENERGYMAP_SHARED_BUILDING_LAYER_IDS } from 'applets/energy/layers/buildingPolygonsLayerConf'

jest.mock('#/common/utils/store', () => ({
  createIndexedDbStorage: () => () => ({
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
  }),
}))
jest.unmock('zustand')
jest.mock('maplibre-gl', () => ({
  __esModule: true,
  default: { addProtocol: jest.fn(), removeProtocol: jest.fn() },
  Map: jest.fn(),
  LngLatBounds: jest.fn(),
}))
jest.mock('maplibre_symbol_utils', () => ({ canvasFill: jest.fn() }))
let current: ReturnType<typeof mockAreaMap>
let runtime: EnergyAreaMapRuntime
let generation: CommittedAreaGeneration | undefined
let status: string
let tileFailed = false
const cancelDetails = jest.fn()
beforeEach(() => {
  current = mockAreaMap()
  useMapStore.setState({
    ...useMapStore.getInitialState(),
    mapContext: 'energy',
    isLoaded: true,
  })
  useMapInstanceStore.setState({ _map: current.map })
  useAppletStore.setState(useAppletStore.getInitialState())
  generation = undefined
  status = 'loading'
  runtime = new EnergyAreaMapRuntime({
    map: current.map,
    lane: { pending: Promise.resolve() },
    publish: (next, value) => {
      generation = next
      status = value
    },
    tileStatus: (value) => {
      tileFailed = value
    },
    cancelDetails,
  })
})
afterEach(async () => {
  await runtime.dispose()
})
const hit = (
  level: 'region' | 'municipality' | 'postal_code',
  code: string
): MapGeoJSONFeature => {
  const descriptor = generation!.descriptors.find(
    (item) => item.level === level
  )!
  return {
    id: `${level}:${code}`,
    source: descriptor.sourceId,
    sourceLayer: descriptor.sourceLayer,
    layer: { id: areaLayerIds(descriptor)[0] },
    properties: {
      level,
      area_code: code,
      area_id: `${level}:${code}`,
      building_count: 5,
      valid_official_class_count: 3,
      certificate_coverage: 0.6,
    },
  } as MapGeoJSONFeature
}
it('registers three genuine descriptors, exact automatic render ranges, ignores legacy overrides, and preserves unrelated groups', async () => {
  await useMapStore.getState().addLayerGroup('other', {
    layerConf: {
      id: 'other',
      style: {
        version: 8,
        sources: {
          other: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          },
        },
        layers: [{ id: 'other-fill', source: 'other', type: 'fill' }],
      },
    },
  })
  await runtime.install()
  expect(status).toBe('ready')
  expect(current.sources.size).toBe(4)
  for (const descriptor of generation!.descriptors) {
    expect(current.sources.get(descriptor.sourceId)).toEqual(descriptor.source)
    expect(
      current.map.getLayer(areaLayerIds(descriptor)[0])![
        'source-layer' as keyof LayerSpecification
      ]
    ).toBe(descriptor.sourceLayer)
  }
  for (const [zoom, expected] of [
    [6.999, 'region'],
    [7, 'municipality'],
    [7.001, 'municipality'],
    [9.999, 'municipality'],
    [10, 'postal_code'],
    [10.001, 'postal_code'],
    [11.999, 'postal_code'],
    [12, 'buildings'],
    [12.001, 'buildings'],
    [11.5, 'postal_code'],
    [6.5, 'region'],
  ] as const) {
    current.zoom(zoom)
    const rendered = generation!.descriptors.filter((descriptor) => {
      const layer = current.layers.get(areaLayerIds(descriptor)[0])!
      return (
        current.map.getLayoutProperty(layer.id, 'visibility') !== 'none' &&
        zoom >= layer.minzoom! &&
        zoom < layer.maxzoom!
      )
    })
    expect(rendered.map((item) => item.level)).toEqual(
      expected === 'buildings' ? [] : [expected]
    )
    expect(useAppletStore.getState().effectiveGeography).toBe(expected)
    for (const descriptor of generation!.descriptors) {
      for (const id of areaLayerIds(descriptor)) {
        const layer = current.layers.get(id)!
        const ranges = {
          region: [0, 7],
          municipality: [7, 10],
          postal_code: [10, 12],
        }
        expect([layer.minzoom, layer.maxzoom]).toEqual(ranges[descriptor.level])
      }
    }
  }
  const legacy = { geographyMode: 'region' }
  useAppletStore.setState(
    legacy as Partial<ReturnType<typeof useAppletStore.getState>>
  )
  current.zoom(20)
  expect(useAppletStore.getState().effectiveGeography).toBe('buildings')
  const layer = current.layers.get(
    areaLayerIds(
      generation!.descriptors.find((item) => item.level === 'region')!
    )[0]
  )!
  expect(layer.maxzoom).toBe(7)
  expect(generation!.descriptors[0].source.maxzoom).toBe(14)
  await runtime.dispose()
  expect([...current.sources.keys()]).toEqual(['other'])
  expect(useMapStore.getState()._layerGroups.other).toBeDefined()
  expect(current.listeners.get('zoom')?.size).toBe(0)
})
it('deduplicates fill/outline/tile fragments through real selection actions and clears at zoom/level/release boundaries', async () => {
  await runtime.install()
  current.zoom(11)
  const feature = hit('postal_code', '00100')
  useMapStore.getState().setSelectedFeaturesByClick([
    feature,
    feature,
    {
      ...feature,
      layer: {
        ...feature.layer,
        id: areaLayerIds(
          generation!.descriptors.find((item) => item.level === 'postal_code')!
        )[1],
      },
    },
  ])
  expect(useMapStore.getState().selectedFeatures).toHaveLength(1)
  expect(
    projectAreaSelection({
      features: useMapStore.getState().selectedFeatures,
      descriptors: generation!.descriptors,
      effective: 'postal_code',
    })?.areaCode
  ).toBe('00100')
  expect([...current.featureState.values()]).toContainEqual({ selected: true })
  current.zoom(11.5)
  expect(useMapStore.getState().selectedFeatures).toHaveLength(1)
  current.zoom(9)
  expect(useMapStore.getState().selectedFeatures).toHaveLength(0)
  current.zoom(11)
  useMapStore
    .getState()
    .setSelectedFeaturesByClick([hit('postal_code', '00100')])
  await runtime.install()
  expect(useMapStore.getState().selectedFeatures).toHaveLength(1)
  expect(cancelDetails).toHaveBeenCalled()
})
it('keeps stable sources bounded, skips unchanged registration and refreshes all loaded sources', async () => {
  await runtime.install()
  const count = (current.map.addSource as jest.Mock).mock.calls.length
  await runtime.install()
  expect(current.map.addSource).toHaveBeenCalledTimes(count)
  runtime.refreshTiles()
  expect((current.map.refreshTiles as jest.Mock).mock.calls).toEqual(
    generation!.descriptors.map((d) => [d.sourceId])
  )
  expect(current.sources.size).toBe(3)
})
it('tracks owned active 404/network/decoder failures, retries the pinned source and requires successful content', async () => {
  await runtime.install()
  const descriptor = generation!.descriptors.find(
    (item) => item.level === 'region'
  )!
  current.fire('error', { sourceId: 'unrelated', error: new Error('Network') })
  expect(tileFailed).toBe(false)
  for (const message of ['404', 'Network', 'Invalid protobuf']) {
    current.fire('error', {
      sourceId: descriptor.sourceId,
      error: new Error(message),
    })
    expect(tileFailed).toBe(true)
    runtime.retryTiles()
    expect(current.map.refreshTiles).toHaveBeenLastCalledWith(
      descriptor.sourceId
    )
    expect(tileFailed).toBe(true)
    current.fire('sourcedata', {
      sourceId: descriptor.sourceId,
      sourceDataType: 'content',
      isSourceLoaded: true,
      tile: { state: 'loaded' },
    })
    expect(tileFailed).toBe(false)
  }
  current.fire('error', {
    sourceId: generation!.descriptors.find(
      (item) => item.level === 'postal_code'
    )!.sourceId,
  })
  expect(tileFailed).toBe(false)
})
it('recovers a replaced style without losing other registrations, then cleans up on exit', async () => {
  await runtime.install()
  current.sources.clear()
  current.layers.clear()
  current.fire('style.load')
  await runtime.install()
  expect(current.sources.size).toBe(3)
  await runtime.dispose()
  expect(current.sources.size).toBe(0)
  expect(Object.keys(useMapStore.getState()._layerGroups)).toHaveLength(0)
  expect(useAppletStore.getState().effectiveGeography).toBe('buildings')
})
it('preserves building visibility and every filter while controls are inapplicable', async () => {
  current.zoom(12)
  useAppletStore.getState().setBuildingTypeFilter('01')
  useAppletStore.getState().setSelectedConstructionDecade(1980)
  useAppletStore.getState().setShowOnlySelectedDecade(true)
  useAppletStore.getState().toggleEnergyCertificateClass('A')
  for (const id of ENERGYMAP_SHARED_BUILDING_LAYER_IDS)
    current.map.addLayer({
      id,
      type: 'fill',
      source: 'buildings',
      layout: { visibility: id.includes('heating') ? 'none' : 'visible' },
    })
  const before = Object.fromEntries(
    ENERGYMAP_SHARED_BUILDING_LAYER_IDS.map((id) => [
      id,
      current.map.getLayoutProperty(id, 'visibility'),
    ])
  )
  const preferences = { ...useAppletStore.getState() }
  current.zoom(6)
  await runtime.install()
  for (const id of ENERGYMAP_SHARED_BUILDING_LAYER_IDS)
    expect(current.map.getLayoutProperty(id, 'visibility')).toBe('none')
  useAppletStore.getState().setBuildingTypeFilter('02')
  useAppletStore.getState().setSelectedConstructionDecade(2000)
  useAppletStore.getState().setShowOnlySelectedDecade(false)
  useAppletStore.getState().toggleEnergyCertificateClass('B')
  for (const key of [
    'buildingTypeFilter',
    'selectedConstructionDecade',
    'showOnlySelectedDecade',
    'activeEnergyCertificateClasses',
  ] as const)
    expect(useAppletStore.getState()[key]).toEqual(preferences[key])
  current.zoom(12)
  for (const id of ENERGYMAP_SHARED_BUILDING_LAYER_IDS)
    expect(current.map.getLayoutProperty(id, 'visibility')).toBe(before[id])
})
it('does not toggle away a selection from a different source that happens to share the same promoted ID', async () => {
  await runtime.install()
  const feature = hit('region', '01')
  current.map.addSource('unrelated', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  useMapStore
    .getState()
    .setSelectedFeatures([{ ...feature, source: 'unrelated' }])
  useMapStore.getState().setSelectedFeaturesByClick([feature])
  expect(useMapStore.getState().selectedFeatures[0].source).toBe(feature.source)
})

it('guards delayed registration after replacement/StrictMode cleanup', async () => {
  const store = useMapStore.getState()
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const add = jest
    .spyOn(store, 'addLayerGroup')
    .mockImplementationOnce(async (id, options) => {
      await gate
      return useMapStore.getInitialState().addLayerGroup(id, options)
    })
  const pending = runtime.install()
  await Promise.resolve()
  const disposed = runtime.dispose()
  release()
  await Promise.all([pending, disposed])
  expect(current.sources.size).toBe(0)
  expect(generation).toBeUndefined()
  expect(useAppletStore.getState().areaAvailable).toBe(false)
  add.mockRestore()
})
it('cleans partial sources on a failed install without overriding automatic geography', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {})
  ;(current.map.addSource as jest.Mock).mockImplementationOnce(() => {
    throw new Error('Rejected source')
  })
  await runtime.install()
  expect(status).toBe('unavailable')
  expect(generation).toBeUndefined()
  expect(current.sources.size).toBe(0)
  expect(useAppletStore.getState().effectiveGeography).toBe('region')
  current.zoom(12)
  useAppletStore.getState().setBuildingTypeFilter('01')
  expect(useAppletStore.getState().buildingTypeFilter).toBe('01')
  runtime.refreshTiles()
  await runtime.install()
  expect(status).toBe('ready')
  error.mockRestore()
})

it('keeps partial tile failure visible until every failed visible fragment succeeds', async () => {
  await runtime.install()
  const descriptor = generation!.descriptors.find(
    (item) => item.level === 'region'
  )!
  for (const key of ['first', 'second'])
    current.fire('error', {
      sourceId: descriptor.sourceId,
      tile: { tileID: { key } },
    })
  current.fire('sourcedata', {
    sourceId: descriptor.sourceId,
    tile: { state: 'loaded', tileID: { key: 'first' } },
    isSourceLoaded: true,
  })
  expect(tileFailed).toBe(true)
  current.fire('sourcedata', {
    sourceId: descriptor.sourceId,
    tile: { state: 'loaded', tileID: { key: 'second' } },
    isSourceLoaded: true,
  })
  expect(tileFailed).toBe(false)
})

it.each([6, 8, 11, 12])(
  'resyncs automatic geography and single listeners on style recovery at zoom %s',
  async (zoom) => {
    current.zoom(zoom)
    await runtime.install()
    current.sources.clear()
    current.layers.clear()
    current.fire('style.load')
    current.fire('styledata')
    // Wait on the existing serialized registration lane.
    await runtime.install()
    expect(useAppletStore.getState().effectiveGeography).toBe(
      zoom < 7
        ? 'region'
        : zoom < 10
          ? 'municipality'
          : zoom < 12
            ? 'postal_code'
            : 'buildings'
    )
    expect(current.sources.size).toBe(3)
    expect(current.listeners.get('zoom')?.size).toBe(1)
    for (const descriptor of generation!.descriptors) {
      for (const id of areaLayerIds(descriptor)) {
        expect(current.layers.get(id)?.maxzoom).toBe(
          descriptor.level === 'region'
            ? 7
            : descriptor.level === 'municipality'
              ? 10
              : 12
        )
      }
    }
  }
)

it('clears owned area/building hover and selection at ordinary band changes while keeping unrelated feature state', async () => {
  await runtime.install()
  const region = hit('region', '01')
  const target = {
    source: region.source,
    sourceLayer: region.sourceLayer,
    id: region.id,
  }
  current.map.setFeatureState(target, { hover: true })
  const unrelated = { source: 'unrelated', id: '01' }
  current.map.setFeatureState(unrelated, { hover: true })
  useMapStore.getState().setSelectedFeatures([region])
  current.zoom(6.5)
  expect(useMapStore.getState().selectedFeatures).toHaveLength(1)
  current.zoom(7)
  expect(useMapStore.getState().selectedFeatures).toEqual([])
  expect(current.featureState.has(JSON.stringify(target))).toBe(false)
  expect(current.featureState.get(JSON.stringify(unrelated))).toEqual({
    hover: true,
  })
  current.map.addSource('energymap_building_polygons', {
    type: 'vector',
    tiles: [],
  })
  current.zoom(12)
  const building = {
    source: 'energymap_building_polygons',
    sourceLayer: 'buildings',
    id: 'building',
  }
  current.map.setFeatureState(building, { hover: true })
  current.zoom(11)
  expect(current.featureState.has(JSON.stringify(building))).toBe(false)
})

it.each(['close', 'new-selection', 'zoom'] as const)(
  'does not resurrect an obsolete selection during queued style recovery: %s',
  async (action) => {
    await runtime.install()
    useMapStore.getState().setSelectedFeatures([hit('region', '01')])
    current.sources.clear()
    current.layers.clear()
    current.featureState.clear()
    const store = useMapStore.getState()
    let release!: () => void
    const gate = new Promise<void>((r) => {
      release = r
    })
    const add = jest
      .spyOn(store, 'addLayerGroup')
      .mockImplementationOnce(async (id, options) => {
        await gate
        return useMapStore.getInitialState().addLayerGroup(id, options)
      })
    current.fire('style.load')
    await new Promise((r) => setTimeout(r, 30))
    if (action === 'close') useMapStore.getState().setSelectedFeatures([])
    else if (action === 'new-selection')
      useMapStore.getState().setSelectedFeatures([hit('region', '02')])
    else current.zoom(8)
    release()
    await runtime.install()
    const selected = useMapStore.getState().selectedFeatures
    expect(selected.map((f) => f.id)).toEqual(
      action === 'new-selection' ? ['region:02'] : []
    )
    expect(
      current.featureState.has(
        JSON.stringify({
          source: 'energymap_areas_region',
          sourceLayer: 'energymap_region_areas',
          id: 'region:01',
        })
      )
    ).toBe(false)
    if (action === 'new-selection')
      expect([...current.featureState.values()]).toContainEqual({
        selected: true,
      })
    add.mockRestore()
  }
)
