import type {
  Map as MapLibreMap,
  MapGeoJSONFeature,
  LayerSpecification,
  SourceSpecification,
} from 'maplibre-gl'
import { useMapStore } from '#/common/store/mapStore'
import { useMapInstanceStore } from '#/common/store/mapStore/mapInstanceStore'
import { useAppletStore } from 'applets/energy/state/appletStore'
import {
  EnergyAreaMapRuntime,
  type CommittedAreaGeneration,
} from './mapRuntime'
import { resolveEnergyAreaApiConfig } from './config'
import { parseAreaMetadata } from './contract'
import { projectAreaSelection } from './selection'
import { areaLayerIds } from 'applets/energy/layers/areaLayers'
import { ENERGYMAP_SHARED_BUILDING_LAYER_IDS } from 'applets/energy/layers/buildingPolygonsLayerConf'
import dataset from '../../../../../utils/test/energyAreas/dataset.json'

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
const config = resolveEnergyAreaApiConfig({
  origin: 'https://energy-areas.fixture.test',
})
const metadata = dataset.snapshots.map((snapshot) =>
  parseAreaMetadata(snapshot.metadata)
)
const mockMap = () => {
  let zoom = 6
  const sources = new Map<string, SourceSpecification>()
  const layers = new Map<string, LayerSpecification>()
  const listeners = new Map<string, Set<(event: never) => void>>()
  const featureState = new Map<string, object>()
  const map = {
    getZoom: () => zoom,
    getStyle: () => ({
      version: 8,
      sources: Object.fromEntries(sources),
      layers: [...layers.values()],
    }),
    isStyleLoaded: () => true,
    getSource: (id: string) => sources.get(id),
    addSource: jest.fn((id: string, source: SourceSpecification) => {
      sources.set(id, JSON.parse(JSON.stringify(source)))
    }),
    removeSource: (id: string) => {
      sources.delete(id)
    },
    getLayer: (id: string) => layers.get(id),
    addLayer: (layer: LayerSpecification) => {
      layers.set(layer.id, JSON.parse(JSON.stringify(layer)))
    },
    removeLayer: (id: string) => {
      layers.delete(id)
    },
    setLayerZoomRange: (id: string, minzoom: number, maxzoom: number) =>
      Object.assign(layers.get(id)!, { minzoom, maxzoom }),
    getLayoutProperty: (id: string, name: string) =>
      (layers.get(id)?.layout as Record<string, unknown>)?.[name],
    setLayoutProperty: (id: string, name: string, value: unknown) => {
      const layer = layers.get(id)!
      layer.layout = { ...layer.layout, [name]: value } as never
    },
    setPaintProperty: (id: string, name: string, value: unknown) => {
      const layer = layers.get(id)!
      layer.paint = { ...layer.paint, [name]: value } as never
    },
    setFeatureState: (target: object, value: object) => {
      featureState.set(JSON.stringify(target), value)
    },
    removeFeatureState: (target: object) => {
      featureState.delete(JSON.stringify(target))
    },
    refreshTiles: jest.fn(),
    on: (name: string, ...args: unknown[]) => {
      const listener = args.at(-1) as (event: never) => void
      if (!listeners.has(name)) listeners.set(name, new Set())
      listeners.get(name)!.add(listener)
    },
    off: (name: string, ...args: unknown[]) => {
      listeners.get(name)?.delete(args.at(-1) as never)
    },
    once: () => {},
    getCanvas: () => ({ style: {} }),
  }
  return {
    map: map as unknown as MapLibreMap,
    sources,
    layers,
    listeners,
    featureState,
    zoom: (value: number) => {
      zoom = value
      ;[...(listeners.get('zoom') ?? [])].forEach((fn) => fn({} as never))
    },
    fire: (name: string, event = {}) =>
      [...(listeners.get(name) ?? [])].forEach((fn) => fn(event as never)),
  }
}
let current: ReturnType<typeof mockMap>
let runtime: EnergyAreaMapRuntime
let generation: CommittedAreaGeneration | undefined
let status: string
let tileFailed = false
const cancelDetails = jest.fn()
beforeEach(() => {
  current = mockMap()
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
    config,
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
      release_id: generation!.metadata.release_id,
      level,
      area_code: code,
      area_id: `${level}:${code}`,
      building_count: 5,
      valid_official_class_count: 3,
      certificate_coverage: 0.6,
    },
  } as MapGeoJSONFeature
}
it('registers three genuine descriptors, exact render ranges, manual overzoom, and preserves unrelated groups', async () => {
  await useMapStore
    .getState()
    .addLayerGroup('other', {
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
  await runtime.promote(metadata[0])
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
  }
  useAppletStore.getState().setGeographyMode('region')
  current.zoom(20)
  expect(useAppletStore.getState().geographyMode).toBe('region')
  const layer = current.layers.get(
    areaLayerIds(
      generation!.descriptors.find((item) => item.level === 'region')!
    )[0]
  )!
  expect(layer.maxzoom).toBe(24)
  expect(generation!.descriptors[0].source.maxzoom).toBe(14)
  await runtime.dispose()
  expect([...current.sources.keys()]).toEqual(['other'])
  expect(useMapStore.getState()._layerGroups.other).toBeDefined()
  expect(current.listeners.get('zoom')?.size).toBe(0)
})
it('deduplicates fill/outline/tile fragments through real selection actions and clears at zoom/level/release boundaries', async () => {
  await runtime.promote(metadata[0])
  current.zoom(11)
  const feature = hit('postal_code', '00100')
  useMapStore
    .getState()
    .setSelectedFeaturesByClick([
      feature,
      feature,
      {
        ...feature,
        layer: {
          ...feature.layer,
          id: areaLayerIds(
            generation!.descriptors.find(
              (item) => item.level === 'postal_code'
            )!
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
  useAppletStore.getState().setGeographyMode('postal_code')
  current.zoom(9)
  expect(useMapStore.getState().selectedFeatures).toHaveLength(1)
  useAppletStore.getState().setGeographyMode('automatic')
  expect(useMapStore.getState().selectedFeatures).toHaveLength(0)
  current.zoom(11)
  useMapStore
    .getState()
    .setSelectedFeaturesByClick([hit('postal_code', '00100')])
  await runtime.promote(metadata[1])
  expect(useMapStore.getState().selectedFeatures).toHaveLength(0)
  expect(generation!.metadata.release_id).toBe(metadata[1].release_id)
  expect(cancelDetails).toHaveBeenCalled()
})
it('pins promotion, skips unchanged metadata, replaces same-release descriptors and ignores queued obsolete installs', async () => {
  await runtime.promote(metadata[0])
  const add = current.map.addSource as jest.Mock
  const count = add.mock.calls.length
  await runtime.promote(metadata[0])
  expect(add).toHaveBeenCalledTimes(count)
  const changed = {
    ...metadata[0],
    layers: {
      ...metadata[0].layers,
      region: { ...metadata[0].layers.region, source_layer: 'different' },
    },
  }
  await runtime.promote(changed)
  expect(
    generation!.descriptors.find((item) => item.level === 'region')?.sourceLayer
  ).toBe('different')
  const first = runtime.promote(metadata[1])
  const second = runtime.promote(metadata[2])
  await Promise.all([first, second])
  expect(generation!.metadata.release_id).toBe(metadata[2].release_id)
  expect(
    [...current.sources.keys()].every((key) =>
      key.includes(metadata[2].release_id)
    )
  ).toBe(true)
  // Retained older releases remain valid.
  await runtime.promote(metadata[0])
  expect(generation!.metadata.release_id).toBe(metadata[0].release_id)
})
it('tracks owned active 404/network/decoder failures, retries the pinned source and requires successful content', async () => {
  await runtime.promote(metadata[0])
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
  await runtime.promote(metadata[0])
  current.sources.clear()
  current.layers.clear()
  current.fire('style.load')
  await runtime.promote(metadata[0])
  expect(current.sources.size).toBe(3)
  expect(generation!.metadata.release_id).toBe(metadata[0].release_id)
  await runtime.dispose()
  expect(current.sources.size).toBe(0)
  expect(Object.keys(useMapStore.getState()._layerGroups)).toHaveLength(0)
  expect(useAppletStore.getState().effectiveGeography).toBe('buildings')
})
it('preserves building visibility and every filter while controls are inapplicable', async () => {
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
  await runtime.promote(metadata[0])
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
  useAppletStore.getState().setGeographyMode('buildings')
  for (const id of ENERGYMAP_SHARED_BUILDING_LAYER_IDS)
    expect(current.map.getLayoutProperty(id, 'visibility')).toBe(before[id])
})
it('does not toggle away a selection from a different source that happens to share the same promoted ID', async () => {
  await runtime.promote(metadata[0])
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

it('guards delayed registration after replacement/StrictMode cleanup and leaves Buildings usable on install failure', async () => {
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
  const pending = runtime.promote(metadata[0])
  await Promise.resolve()
  const disposed = runtime.dispose()
  release()
  await Promise.all([pending, disposed])
  expect(current.sources.size).toBe(0)
  expect(generation).toBeUndefined()
  expect(useAppletStore.getState().areaAvailable).toBe(false)
  add.mockRestore()
})
it('cleans partial sources on a failed install and keeps prior building preferences operable', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {})
  ;(current.map.addSource as jest.Mock).mockImplementationOnce(() => {
    throw new Error('Rejected source')
  })
  await runtime.promote(metadata[0])
  expect(status).toBe('unavailable')
  expect(generation).toBeUndefined()
  expect(current.sources.size).toBe(0)
  expect(useAppletStore.getState().effectiveGeography).toBe('buildings')
  useAppletStore.getState().setBuildingTypeFilter('01')
  expect(useAppletStore.getState().buildingTypeFilter).toBe('01')
  await runtime.promote(metadata[0])
  expect(status).toBe('ready')
  error.mockRestore()
})

it('keeps partial tile failure visible until every failed visible fragment succeeds', async () => {
  await runtime.promote(metadata[0])
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
