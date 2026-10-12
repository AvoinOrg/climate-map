import { mockAreaMap } from '../../../../../utils/test/energyAreas/mapMock'
import type { MapGeoJSONFeature } from 'maplibre-gl'
import { useMapStore } from '#/common/store/mapStore'
import { useMapInstanceStore } from '#/common/store/mapStore/mapInstanceStore'
import { useAppletStore } from 'applets/energy/state/appletStore'
import {
  EnergyAreaMapRuntime,
  type AreaRegistrationLane,
  type CommittedAreaGeneration,
} from './mapRuntime'
import { projectAreaSelection } from './selection'
import { AUTOMATIC_AREA_RANGES } from './mapModes'
import { areaLayerIds } from 'applets/energy/layers/areaLayers'
import {
  ENERGYMAP_BUILDING_POLYGONS_FILL_LAYER_ID,
  ENERGYMAP_SHARED_BUILDING_LAYER_IDS,
} from 'applets/energy/layers/buildingPolygonsLayerConf'
import {
  ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
  ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
} from 'applets/energy/layers/buildingSource'
import { EnergyAreaNavigation } from './navigation'

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
let lane: AreaRegistrationLane
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
  lane = { pending: Promise.resolve() }
  runtime = new EnergyAreaMapRuntime({
    map: current.map,
    lane,
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
  await lane.pending
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
    await lane.pending
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

it.each([6, 8, 11, 12])(
  'recovers a retained-source replacement when early style events are not ready at zoom %s',
  async (zoom) => {
    current.zoom(zoom)
    await runtime.install()
    const level = useAppletStore.getState().effectiveGeography
    const selected =
      level === 'buildings'
        ? undefined
        : hit(
            level,
            { region: '01', municipality: '091', postal_code: '00100' }[level]
          )
    if (selected) useMapStore.getState().setSelectedFeatures([selected])
    current.map.addSource('base', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
    current.map.addLayer({ id: 'base-fill', type: 'fill', source: 'base' })
    const baseSource = current.sources.get('base')
    const baseLayer = current.layers.get('base-fill')
    const sourceCount = (current.map.addSource as jest.Mock).mock.calls.length
    for (const descriptor of generation!.descriptors) {
      for (const id of areaLayerIds(descriptor)) current.map.removeLayer(id)
      current.map.removeSource(descriptor.sourceId)
    }
    current.featureState.clear()
    const loaded = jest.spyOn(current.map, 'isStyleLoaded').mockReturnValue(false)
    runtime.refreshTiles()
    current.fire('style.load')
    current.fire('styledata')
    await lane.pending
    expect(current.sources.size).toBe(1)
    expect(useAppletStore.getState().areaAvailable).toBe(false)
    loaded.mockReturnValue(true)
    current.fire('idle')
    current.fire('idle')
    current.fire('styledata')
    await lane.pending
    expect(status).toBe('ready')
    expect(useAppletStore.getState().areaAvailable).toBe(true)
    expect(useAppletStore.getState().effectiveGeography).toBe(level)
    expect(current.sources.size).toBe(4)
    expect(current.sources.get('base')).toBe(baseSource)
    expect(current.layers.get('base-fill')).toBe(baseLayer)
    expect(current.map.addSource).toHaveBeenCalledTimes(sourceCount + 3)
    for (const descriptor of generation!.descriptors)
      for (const id of areaLayerIds(descriptor)) {
        const layer = current.layers.get(id)!
        const range = AUTOMATIC_AREA_RANGES[descriptor.level]
        expect([layer.minzoom, layer.maxzoom]).toEqual([
          range.minzoom,
          range.maxzoom,
        ])
        expect(current.map.getLayoutProperty(id, 'visibility')).toBe('visible')
      }
    if (selected)
      expect(
        current.featureState.get(JSON.stringify({
          source: selected.source,
          sourceLayer: selected.sourceLayer,
          id: selected.id,
        }))
      ).toEqual({ selected: true })
    for (const event of ['style.load', 'styledata', 'idle'])
      expect(current.listeners.get(event)?.size).toBe(1)
    await runtime.dispose()
    for (const event of ['style.load', 'styledata', 'idle'])
      expect(current.listeners.get(event)?.size).toBe(0)
    current.fire('idle')
    await lane.pending
    expect([...current.sources.keys()]).toEqual(['base'])
    loaded.mockRestore()
  }
)

it.each(['source', 'layer'] as const)(
  'Refresh repairs a missing owned %s without a style event or stale registration shortcut',
  async (missing) => {
    current.zoom(11)
    await runtime.install()
    const selected = hit('postal_code', '00100')
    useMapStore.getState().setSelectedFeatures([selected])
    const descriptor = generation!.descriptors.find(
      (item) => item.level === 'postal_code'
    )!
    current.map.removeLayer(areaLayerIds(descriptor)[0])
    if (missing === 'source') {
      current.map.removeLayer(areaLayerIds(descriptor)[1])
      current.map.removeSource(descriptor.sourceId)
      current.featureState.clear()
    }
    runtime.refreshTiles()
    runtime.refreshTiles()
    await lane.pending
    expect(current.sources.size).toBe(3)
    expect(current.layers.size).toBe(6)
    expect(status).toBe('ready')
    expect(useMapStore.getState().selectedFeatures).toEqual([selected])
    expect([...current.featureState.values()]).toContainEqual({ selected: true })
    const count = (current.map.addSource as jest.Mock).mock.calls.length
    current.fire('idle')
    runtime.refreshTiles()
    await lane.pending
    expect(current.map.addSource).toHaveBeenCalledTimes(count)
    expect(current.map.refreshTiles).toHaveBeenCalledTimes(3)
  }
)

const buildingHit = (id: string): MapGeoJSONFeature =>
  ({
    id,
    source: ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
    sourceLayer: ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
    layer: { id: ENERGYMAP_BUILDING_POLYGONS_FILL_LAYER_ID },
    properties: { building_key: id },
  }) as MapGeoJSONFeature
const retainBuildingStyle = () => {
  current.map.addSource(ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID, {
    type: 'vector',
    tiles: [],
  })
  current.map.addLayer({
    id: ENERGYMAP_BUILDING_POLYGONS_FILL_LAYER_ID,
    type: 'fill',
    source: ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
    'source-layer': ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
  })
  for (const descriptor of generation!.descriptors) {
    for (const id of areaLayerIds(descriptor)) current.map.removeLayer(id)
    current.map.removeSource(descriptor.sourceId)
  }
  current.featureState.clear()
}
const featureTarget = (feature: MapGeoJSONFeature) => ({
  source: feature.source,
  sourceLayer: feature.sourceLayer,
  id: feature.id,
})

it.each(['postal_code', 'buildings'] as const)(
  'restores current %s selection once after a replacement retaining all sources/layers becomes ready',
  async (level) => {
    current.zoom(level === 'buildings' ? 16 : 11)
    await runtime.install()
    current.map.addSource(ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID, {
      type: 'vector',
      tiles: [],
    })
    current.map.addLayer({
      id: ENERGYMAP_BUILDING_POLYGONS_FILL_LAYER_ID,
      type: 'fill',
      source: ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
      'source-layer': ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
    })
    current.map.addSource('unrelated', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
    const selected = level === 'buildings'
      ? buildingHit('current')
      : hit('postal_code', '00370')
    const unrelated = { ...selected, source: 'unrelated' }
    useMapStore.getState().setSelectedFeatures([selected, unrelated])
    // setStyle(getStyle(), { diff: false }) retains registration but clears state.
    current.featureState.clear()
    const sources = new Map(current.sources)
    const layers = new Map(current.layers)
    const sourceCount = (current.map.addSource as jest.Mock).mock.calls.length
    const restore = jest.spyOn(current.map, 'setFeatureState')
    const loaded = jest.spyOn(current.map, 'isStyleLoaded').mockReturnValue(false)
    current.fire('style.load')
    current.fire('styledata')
    current.fire('idle')
    expect(restore).not.toHaveBeenCalled()
    loaded.mockReturnValue(true)
    current.fire('idle')
    expect(restore).toHaveBeenCalledTimes(1)
    expect(current.featureState.get(JSON.stringify(featureTarget(selected))))
      .toEqual({ selected: true })
    expect(current.featureState.has(JSON.stringify(featureTarget(unrelated))))
      .toBe(false)
    expect(useMapStore.getState().selectedFeatures).toEqual([selected, unrelated])
    expect(current.map.addSource).toHaveBeenCalledTimes(sourceCount)
    for (const [id, source] of sources) expect(current.sources.get(id)).toBe(source)
    for (const [id, layer] of layers) expect(current.layers.get(id)).toBe(layer)
    current.fire('styledata')
    current.fire('idle')
    expect(restore).toHaveBeenCalledTimes(1)
    // A subsequent replacement can already be ready at style.load.
    current.featureState.clear()
    current.fire('style.load')
    expect(restore).toHaveBeenCalledTimes(2)
    expect(current.featureState.get(JSON.stringify(featureTarget(selected))))
      .toEqual({ selected: true })
    loaded.mockRestore()
    restore.mockRestore()
  }
)

describe.each(['postal_code', 'buildings'] as const)(
  'retained-all style readiness with current %s selection',
  (level) => {
    it.each(['close', 'new-selection', 'zoom', 'back', 'navigation', 'exit', 'dispose'] as const)(
      'does not restore the obsolete selection after %s',
      async (action) => {
        current.zoom(8)
        await runtime.install()
        const navigation = new EnergyAreaNavigation({
          map: current.map,
          generation: () => generation,
          cancelDetails,
          changed: () => {},
        })
        useMapStore.getState().setSelectedFeatures([hit('municipality', '091')])
        navigation.navigateRelated({ level: 'postal_code', areaCode: '00370' })
        if (level === 'buildings') {
          current.map.addSource(ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID, {
            type: 'vector',
            tiles: [],
          })
          current.map.addLayer({
            id: ENERGYMAP_BUILDING_POLYGONS_FILL_LAYER_ID,
            type: 'fill',
            source: ENERGYMAP_BUILDING_POLYGONS_SOURCE_ID,
            'source-layer': ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
          })
          navigation.showBuildings()
          useMapStore.getState().setSelectedFeatures([buildingHit('current')])
        }
        const selected = useMapStore.getState().selectedFeatures[0]
        current.featureState.clear()
        const loaded = jest.spyOn(current.map, 'isStyleLoaded').mockReturnValue(false)
        current.fire('style.load')
        current.fire('styledata')
        if (action === 'close') useMapStore.getState().setSelectedFeatures([])
        else if (action === 'new-selection')
          useMapStore.getState().setSelectedFeatures([
            level === 'buildings' ? buildingHit('new') : hit('postal_code', '00100'),
          ])
        else if (action === 'zoom') current.zoom(6)
        else if (action === 'back') navigation.back()
        else if (action === 'navigation') {
          if (level === 'buildings') navigation.back()
          navigation.navigateRelated({ level: 'municipality', areaCode: '049' })
        } else if (action === 'exit') useMapStore.setState({ mapContext: 'main' })
        else void runtime.dispose()
        current.featureState.clear()
        loaded.mockReturnValue(true)
        current.fire('idle')
        await lane.pending
        expect(current.featureState.has(JSON.stringify(featureTarget(selected))))
          .toBe(false)
        if (['new-selection', 'back', 'navigation'].includes(action)) {
          const next = useMapStore.getState().selectedFeatures[0]
          expect(current.featureState.get(JSON.stringify(featureTarget(next))))
            .toEqual({ selected: true })
        }
        navigation.dispose()
        loaded.mockRestore()
      }
    )
  }
)

it('restores only the current Energy building highlight after retained-source style replacement', async () => {
  current.zoom(16)
  await runtime.install()
  retainBuildingStyle()
  current.map.addSource('unrelated', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  const selected = buildingHit('current')
  const extra = buildingHit('extra')
  const unrelated = { ...selected, source: 'unrelated' }
  useMapStore.getState().setSelectedFeatures([selected, extra, unrelated])
  current.featureState.clear()
  const buildingSource = current.sources.get(selected.source)
  const buildingLayer = current.layers.get(selected.layer.id)
  const loaded = jest.spyOn(current.map, 'isStyleLoaded').mockReturnValue(false)
  current.fire('style.load')
  current.fire('styledata')
  await lane.pending
  expect(current.featureState.size).toBe(0)
  loaded.mockReturnValue(true)
  current.fire('idle')
  await lane.pending
  expect(status).toBe('ready')
  expect(useAppletStore.getState().effectiveGeography).toBe('buildings')
  expect(useMapStore.getState().selectedFeatures).toEqual([
    selected, extra, unrelated,
  ])
  expect(
    current.featureState.get(JSON.stringify(featureTarget(selected)))
  ).toEqual({ selected: true })
  expect(current.featureState.has(JSON.stringify(featureTarget(extra)))).toBe(
    false
  )
  expect(
    current.featureState.has(JSON.stringify(featureTarget(unrelated)))
  ).toBe(false)
  expect(current.sources.get(selected.source)).toBe(buildingSource)
  expect(current.layers.get(selected.layer.id)).toBe(buildingLayer)
  loaded.mockRestore()
})

it.each([
  'close', 'new-selection', 'zoom', 'back', 'navigation', 'exit', 'dispose',
  'missing-source', 'missing-layer',
] as const)(
  'does not restore stale or unavailable building state during queued recovery: %s',
  async (action) => {
    await runtime.install()
    current.zoom(11)
    useMapStore.getState().setSelectedFeatures([hit('postal_code', '00100')])
    const navigation = new EnergyAreaNavigation({
      map: current.map,
      generation: () => generation,
      cancelDetails,
      changed: () => {},
    })
    navigation.showBuildings()
    retainBuildingStyle()
    const selected = buildingHit('current')
    useMapStore.getState().setSelectedFeatures([selected])
    current.featureState.clear()
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const add = jest
      .spyOn(useMapStore.getState(), 'addLayerGroup')
      .mockImplementationOnce(async (id, options) => {
        await gate
        return useMapStore.getInitialState().addLayerGroup(id, options)
      })
    current.fire('style.load')
    await new Promise((resolve) => setTimeout(resolve, 30))
    if (action === 'close') useMapStore.getState().setSelectedFeatures([])
    else if (action === 'new-selection') {
      useMapStore.getState().setSelectedFeatures([buildingHit('new')])
      current.featureState.clear()
    } else if (action === 'zoom') current.zoom(11)
    else if (action === 'back') navigation.back()
    else if (action === 'navigation') {
      useMapStore.getState().setSelectedFeatures([hit('municipality', '091')])
      current.zoom(8)
    } else if (action === 'exit') useMapStore.setState({ mapContext: 'main' })
    else if (action === 'dispose') void runtime.dispose()
    else if (action === 'missing-source')
      current.map.removeSource(selected.source)
    else current.map.removeLayer(selected.layer.id)
    release()
    await lane.pending
    expect(
      current.featureState.get(JSON.stringify(featureTarget(selected)))
    ).not.toEqual({ selected: true })
    if (action === 'new-selection')
      expect(
        current.featureState.get(JSON.stringify(featureTarget(buildingHit('new'))))
      ).toEqual({ selected: true })
    if (action === 'back') {
      expect(useAppletStore.getState().effectiveGeography).toBe('postal_code')
      expect(
        useMapStore.getState().selectedFeatures.map((feature) => feature.id)
      ).toEqual(['postal_code:00100'])
    }
    navigation.dispose()
    add.mockRestore()
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
    sourceLayer: ENERGYMAP_BUILDING_POLYGONS_SOURCE_LAYER,
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
    await lane.pending
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
